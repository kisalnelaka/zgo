/**
 * Zeego Dispatch Engine - WebSocket Transport Layer (Socket.io)
 * Coordinates real-time bi-directional telemetry and event lifecycle across
 * Admin Operations, Rider Cockpits, and Customer Tracking clients.
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { telemetryCache } from '../redis/client.js';
import { db } from '../db/client.js';
import { NotificationService } from '../services/notificationService.js';
import {
  LocationTelemetry,
  OrderStatus,
  OrderRecord,
} from '../types/index.js';

export class SocketServer {
  private io: SocketIOServer;

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 10000,
      pingInterval: 5000,
    });

    this.registerHandlers();
    console.log('[SOCKET.IO] Real-time engine initialized.');
  }

  private registerHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[SOCKET.IO] Client connected: ${socket.id}`);

      // 1. Client Room Management
      socket.on('join:admin', () => {
        socket.join('admin');
        console.log(`[SOCKET.IO] Socket ${socket.id} joined 'admin' room.`);
      });

      socket.on('join:driver', (driverId: string) => {
        if (!driverId) return;
        const room = `driver:${driverId}`;
        socket.join(room);
        console.log(`[SOCKET.IO] Driver socket ${socket.id} joined '${room}'.`);
      });

      socket.on('join:order', (orderId: string) => {
        if (!orderId) return;
        const room = `order:${orderId}`;
        socket.join(room);
        console.log(`[SOCKET.IO] Customer socket ${socket.id} joined '${room}'.`);
      });

      // 2. High-Frequency GPS Telemetry Event
      // Driver emits: { driverId, lat, lng, heading, speed, timestamp, orderId? }
      socket.on('ping_location', async (telemetry: LocationTelemetry & { orderId?: string }) => {
        if (!telemetry || !telemetry.driverId || telemetry.lat == null || telemetry.lng == null) {
          return;
        }

        const now = Date.now();
        const payload: LocationTelemetry = {
          driverId: telemetry.driverId,
          lat: telemetry.lat,
          lng: telemetry.lng,
          heading: telemetry.heading ?? 0,
          speed: telemetry.speed ?? 0,
          accuracy: telemetry.accuracy ?? 5,
          timestamp: telemetry.timestamp || now,
        };

        // Write directly to Redis (NOT Postgres)
        await telemetryCache.setDriverLocation(payload);

        // Broadcast to Admin Operation Center
        this.io.to('admin').emit('location_update', payload);

        // If telemetry contains orderId or driver is associated with an active order, broadcast to order room
        if (telemetry.orderId) {
          this.io.to(`order:${telemetry.orderId}`).emit('location_update', payload);
        }
      });

      // 3. Driver Order Acceptance & Lifecycle Status Change
      socket.on(
        'status_change',
        async (data: { orderId: string; driverId: string; status: OrderStatus }) => {
          const { orderId, driverId, status } = data;
          console.log(`[STATUS_CHANGE] Order ${orderId} -> ${status} by Driver ${driverId}`);

          try {
            const updatedOrder = await db.updateOrderStatus(orderId, status);
            if (!updatedOrder) {
              console.warn(`[STATUS_CHANGE] Order ${orderId} not found.`);
              return;
            }

            // Customer SMS Notification Triggers
            if (status === 'IN_TRANSIT') {
              const driver = await db.getDriverById(driverId);
              NotificationService.notifyOrderInTransit(
                updatedOrder.customerPhone,
                updatedOrder.customerName,
                updatedOrder.trackingCode,
                driver?.name || 'Assigned Driver'
              );
            } else if (status === 'DELIVERED') {
              NotificationService.notifyOrderDelivered(
                updatedOrder.customerPhone,
                updatedOrder.customerName,
                updatedOrder.trackingCode
              );
            }

            // Broadcast status change across Admin and Customer rooms
            this.io.to('admin').emit('order_status_updated', updatedOrder);
            this.io.to(`order:${orderId}`).emit('order_status_updated', updatedOrder);
            this.io.to(`order:${updatedOrder.trackingCode}`).emit('order_status_updated', updatedOrder);

            // Confirm back to the driver
            socket.emit('status_change_acknowledged', { orderId, status });
          } catch (error) {
            console.error(`[STATUS_CHANGE] Error updating order ${orderId}:`, error);
          }
        }
      );

      socket.on('disconnect', () => {
        console.log(`[SOCKET.IO] Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Dispatch offer from server to specific driver.
   */
  public dispatchOrder(order: OrderRecord, driverId: string): void {
    const driverRoom = `driver:${driverId}`;
    console.log(`[DISPATCH] Offering order ${order.trackingCode} to ${driverRoom}`);

    this.io.to(driverRoom).emit('order_dispatch', {
      order,
      driverId,
    });

    // Notify admin
    this.io.to('admin').emit('order_status_updated', order);
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
