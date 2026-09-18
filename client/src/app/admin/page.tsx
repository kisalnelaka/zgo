'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapboxMap } from '@/components/MapboxMap';
import { getSocket } from '@/lib/socket';
import { fetchOrders, fetchDrivers, assignOrder, Order, Driver } from '@/lib/api';
import {
  Compass,
  Truck,
  Package,
  Radio,
  Clock,
  Send,
  AlertCircle,
  Activity,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

interface TelemetryPing {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverLocations, setDriverLocations] = useState<Record<string, TelemetryPing>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [eventLogs, setEventLogs] = useState<{ id: string; time: string; text: string; type: 'telemetry' | 'order' | 'dispatch' }[]>([]);
  const [isLiveTelemetryActive, setIsLiveTelemetryActive] = useState(false);

  // Load initial data
  const loadData = async () => {
    try {
      const [ordersData, driversData] = await Promise.all([fetchOrders(), fetchDrivers()]);
      setOrders(ordersData);
      setDrivers(driversData);

      // Preload driver coordinates from initial response
      const locMap: Record<string, TelemetryPing> = {};
      driversData.forEach((d) => {
        if (d.liveTelemetry) {
          locMap[d.id] = {
            driverId: d.id,
            lat: d.liveTelemetry.lat,
            lng: d.liveTelemetry.lng,
            heading: d.liveTelemetry.heading,
            speed: d.liveTelemetry.speed,
            timestamp: d.liveTelemetry.timestamp,
          };
        }
      });
      setDriverLocations(locMap);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();

    // 1. Join Admin Operations Room
    socket.emit('join:admin');

    // 2. High-Frequency Location Telemetry Listener
    const handleLocationUpdate = (data: TelemetryPing) => {
      setDriverLocations((prev) => ({
        ...prev,
        [data.driverId]: data,
      }));
      setIsLiveTelemetryActive(true);

      // Add to rolling event stream (keep last 12 events)
      setEventLogs((prev) => [
        {
          id: Math.random().toString(),
          time: new Date(data.timestamp).toLocaleTimeString(),
          text: `Driver ${data.driverId} pinged GPS: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)} (${(data.speed || 0).toFixed(0)} km/h)`,
          type: 'telemetry',
        },
        ...prev.slice(0, 11),
      ]);
    };

    // 3. Order Lifecycle Listeners
    const handleOrderCreated = (order: Order) => {
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      setEventLogs((prev) => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString(),
          text: `New order ${order.trackingCode} ingested into Doha dispatch pipeline.`,
          type: 'order',
        },
        ...prev.slice(0, 11),
      ]);
    };

    const handleOrderStatusUpdated = (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...order } : o)));
      setEventLogs((prev) => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString(),
          text: `Order ${order.trackingCode} status transitioned to ${order.status}.`,
          type: 'dispatch',
        },
        ...prev.slice(0, 11),
      ]);
    };

    socket.on('location_update', handleLocationUpdate);
    socket.on('order_created', handleOrderCreated);
    socket.on('order_status_updated', handleOrderStatusUpdated);

    return () => {
      socket.off('location_update', handleLocationUpdate);
      socket.off('order_created', handleOrderCreated);
      socket.off('order_status_updated', handleOrderStatusUpdated);
    };
  }, []);

  const handleManualAssign = async (orderId: string, driverId: string) => {
    setAssigningId(orderId);
    try {
      const updated = await assignOrder(orderId, driverId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      console.error('Failed to assign order:', err);
    } finally {
      setAssigningId(null);
    }
  };

  // Metrics
  const unassignedOrders = orders.filter((o) => o.status === 'PENDING');
  const inTransitOrders = orders.filter((o) => o.status === 'IN_TRANSIT');
  const assignedOrders = orders.filter((o) => o.status === 'ASSIGNED');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  // Active driver telemetry (use first active driver for focused map marker)
  const activeDriver = drivers[0];
  const activeDriverCoords = activeDriver && driverLocations[activeDriver.id]
    ? {
        lat: driverLocations[activeDriver.id].lat,
        lng: driverLocations[activeDriver.id].lng,
        heading: driverLocations[activeDriver.id].heading,
      }
    : activeDriver
    ? { lat: activeDriver.currentLat, lng: activeDriver.currentLng, heading: 0 }
    : null;

  // Selected or active order coordinates for map
  const activeMapOrder = selectedOrder || unassignedOrders[0] || orders[0];

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col bg-[#00052e] text-white">
      {/* Top Telemetry KPI Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#131e5c] bg-[#02093a]/90 px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#34fcff] animate-pulse" />
            <span className="font-mono text-xs font-semibold tracking-wider text-white">
              DOHA DISPATCH HQ
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[#131e5c]" />

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#afb4db]">
              <span className="text-[#34fcff] font-bold">{drivers.length}</span> ONLINE DRIVERS
            </div>
            <div className="flex items-center gap-1.5 text-[#afb4db]">
              <span className="text-[#f59e0b] font-bold">{unassignedOrders.length}</span> UNASSIGNED
            </div>
            <div className="flex items-center gap-1.5 text-[#afb4db]">
              <span className="text-[#34fcff] font-bold">{inTransitOrders.length}</span> IN TRANSIT
            </div>
            <div className="flex items-center gap-1.5 text-[#afb4db]">
              <span className="text-[#10b981] font-bold">{deliveredOrders.length}</span> DELIVERED
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-[4px] border border-[#0428cb]/50 bg-[#0428cb]/10 px-2.5 py-1 font-mono text-[11px] text-[#34fcff]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34fcff] animate-ping" />
            <span>REDIS TELEMETRY: {isLiveTelemetryActive ? 'STREAMING' : 'READY'}</span>
          </div>
        </div>
      </div>

      {/* Main Split: Fullscreen Map (Center/Left) + Unassigned & Telemetry Panel (Right) */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Fullscreen Map Viewport */}
        <div className="relative flex-1 bg-[#00052e]">
          <MapboxMap
            driverCoords={activeDriverCoords}
            pickupCoords={
              activeMapOrder
                ? {
                    lat: activeMapOrder.pickupLat,
                    lng: activeMapOrder.pickupLng,
                    label: activeMapOrder.pickupAddress,
                  }
                : null
            }
            dropoffCoords={
              activeMapOrder
                ? {
                    lat: activeMapOrder.dropoffLat,
                    lng: activeMapOrder.dropoffLng,
                    label: activeMapOrder.dropoffAddress,
                  }
                : null
            }
          />

          {/* Floating Driver Marker Status Card (Ameba style) */}
          {activeDriver && (
            <div className="absolute top-4 left-4 z-10 w-72 rounded-[8px] border border-[#131e5c] bg-[#00052e]/90 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#34fcff] shadow-cyan-glow" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#6b6b83]">
                    ACTIVE RIDER UNIT
                  </span>
                </div>
                <span className="rounded-[4px] bg-[#0428cb]/30 px-1.5 py-0.5 font-mono text-[10px] text-[#34fcff]">
                  {activeDriver.status}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-white">{activeDriver.name}</div>
              <div className="font-mono text-xs text-[#8185a0]">{activeDriver.vehicle}</div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#131e5c] pt-2 font-mono text-[11px]">
                <div>
                  <span className="text-[#6b6b83]">LAT: </span>
                  <span className="text-[#afb4db]">
                    {driverLocations[activeDriver.id]?.lat.toFixed(4) ?? activeDriver.currentLat.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-[#6b6b83]">LNG: </span>
                  <span className="text-[#afb4db]">
                    {driverLocations[activeDriver.id]?.lng.toFixed(4) ?? activeDriver.currentLng.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-[#6b6b83]">SPEED: </span>
                  <span className="text-[#34fcff]">
                    {(driverLocations[activeDriver.id]?.speed ?? 0).toFixed(0)} km/h
                  </span>
                </div>
                <div>
                  <span className="text-[#6b6b83]">HEADING: </span>
                  <span className="text-[#afb4db]">
                    {(driverLocations[activeDriver.id]?.heading ?? 0).toFixed(0)}°
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Drawer: Unassigned Queue & Event Feed */}
        <div className="flex w-96 flex-col border-l border-[#131e5c] bg-[#02093a]/95 backdrop-blur-md">
          {/* Header */}
          <div className="border-b border-[#131e5c] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-white">DISPATCH DISK</h2>
              <span className="font-mono text-[11px] text-[#34fcff]">
                {unassignedOrders.length} PENDING
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-[#6b6b83]">
              UNASSIGNED ORDERS READY FOR DISPATCH
            </p>
          </div>

          {/* Unassigned Orders List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {unassignedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[8px] border border-dashed border-[#131e5c] p-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-[#10b981]/50 mb-2" />
                <span className="text-xs text-[#8185a0]">All orders currently dispatched</span>
                <span className="mt-1 font-mono text-[10px] text-[#6b6b83]">
                  Use the Command Hub to inject a new test order
                </span>
              </div>
            ) : (
              unassignedOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`cursor-pointer rounded-[8px] border p-3.5 transition-all ${
                      isSelected
                        ? 'border-[#34fcff] bg-[#0428cb]/20 shadow-cyan-glow'
                        : 'border-[#131e5c] bg-[#00052e]/80 hover:border-[#0428cb]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-[#34fcff]">
                        {order.trackingCode}
                      </span>
                      <span className="rounded-[4px] bg-[#f59e0b]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#f59e0b]">
                        PENDING
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-medium text-white">{order.customerName}</div>
                    <div className="text-[11px] text-[#8185a0] truncate">{order.itemsDescription}</div>

                    <div className="mt-3 space-y-1 text-[11px] font-mono border-t border-[#131e5c] pt-2">
                      <div className="flex items-start gap-1.5 text-[#afb4db]">
                        <span className="text-[#10b981] font-bold">A:</span>
                        <span className="truncate">{order.pickupAddress}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-[#afb4db]">
                        <span className="text-[#ef4444] font-bold">B:</span>
                        <span className="truncate">{order.dropoffAddress}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#131e5c]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (drivers[0]) handleManualAssign(order.id, drivers[0].id);
                        }}
                        disabled={assigningId === order.id || drivers.length === 0}
                        className="flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[#0428cb] py-2 text-xs font-semibold text-white transition-all hover:bg-[#0428cb]/80 disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" />
                        <span>
                          {assigningId === order.id ? 'Dispatching...' : 'Manual Assign to Tariq'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Real-time Telemetry Event Feed (Bottom of side panel) */}
          <div className="h-44 border-t border-[#131e5c] bg-[#00052e] p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] tracking-wider text-[#6b6b83]">
                TELEMETRY EVENT STREAM
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-ping" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[10px] text-[#8185a0]">
              {eventLogs.length === 0 ? (
                <div className="text-[#6b6b83] italic">Awaiting telemetry pings...</div>
              ) : (
                eventLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-1.5 leading-tight">
                    <span className="text-[#6b6b83]">[{log.time}]</span>
                    <span
                      className={
                        log.type === 'telemetry'
                          ? 'text-[#34fcff]'
                          : log.type === 'dispatch'
                          ? 'text-[#10b981]'
                          : 'text-[#f59e0b]'
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
