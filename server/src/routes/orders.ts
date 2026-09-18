/**
 * Zeego Dispatch Engine - Orders REST Controller
 * Endpoints for order ingestion, manual dispatch, and lifecycle queries.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { telemetryCache } from '../redis/client.js';
import { NotificationService } from '../services/notificationService.js';
import { SocketServer } from '../socket/index.js';
import { z } from 'zod';

const createOrderSchema = z.object({
  pickupAddress: z.string().min(3),
  pickupLat: z.number(),
  pickupLng: z.number(),
  dropoffAddress: z.string().min(3),
  dropoffLat: z.number(),
  dropoffLng: z.number(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  itemsDescription: z.string().optional(),
  driverId: z.string().optional(),
});

export function createOrdersRouter(socketServer: SocketServer): Router {
  const router = Router();

  /**
   * GET /api/orders
   * Retrieve list of all orders with driver information.
   */
  router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
      const orders = await db.getOrders();
      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('[API] Error fetching orders:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /api/orders/:id
   * Retrieve order details along with real-time driver telemetry from Redis.
   */
  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = String(req.params.id);
      const order = await db.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      // If assigned to a driver, enrich with real-time cached GPS from Redis
      let driverLocation = null;
      if (order.driverId) {
        driverLocation = await telemetryCache.getDriverLocation(order.driverId);
      }

      res.json({
        success: true,
        data: {
          ...order,
          driverLiveLocation: driverLocation,
        },
      });
    } catch (error) {
      console.error('[API] Error fetching order:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * POST /api/orders
   * Ingest new delivery request.
   */
  router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      const order = await db.createOrder(parsed.data);

      // Notify Admin Operations room
      socketServer.getIO().to('admin').emit('order_created', order);

      // Auto-dispatch if driverId provided
      if (parsed.data.driverId) {
        const assignedOrder = await db.assignOrder(order.id, parsed.data.driverId);
        if (assignedOrder) {
          socketServer.dispatchOrder(assignedOrder, parsed.data.driverId);
          NotificationService.notifyOrderAssigned(
            assignedOrder.customerPhone,
            assignedOrder.customerName,
            assignedOrder.trackingCode,
            assignedOrder.driver?.name || 'Tariq Al-Mansoor'
          );
        }
      }

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      console.error('[API] Error creating order:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * POST or PATCH /api/orders/:id/assign
   * Manual dispatch from Admin Operations panel or external integrations.
   */
  const handleAssign = async (req: Request, res: Response): Promise<void> => {
    try {
      const { driverId } = req.body;
      if (!driverId) {
        res.status(400).json({ success: false, error: 'driverId is required' });
        return;
      }

      const orderId = String(req.params.id);
      const updated = await db.assignOrder(orderId, driverId);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Order or Driver not found' });
        return;
      }

      // Emit WebSocket dispatch offer to Rider
      socketServer.dispatchOrder(updated, driverId);

      // Trigger Mock SMS
      NotificationService.notifyOrderAssigned(
        updated.customerPhone,
        updated.customerName,
        updated.trackingCode,
        updated.driver?.name || 'Assigned Driver'
      );

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('[API] Error assigning order:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };

  router.post('/:id/assign', handleAssign);
  router.patch('/:id/assign', handleAssign);

  return router;
}
