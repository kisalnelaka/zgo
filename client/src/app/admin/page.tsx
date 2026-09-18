'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapboxMap } from '@/components/MapboxMap';
import { getSocket } from '@/lib/socket';
import { fetchOrders, fetchDrivers, assignOrder, Order, Driver } from '@/lib/api';
import { PhoneConnectModal } from '@/components/PhoneConnectModal';
import {
  Compass,
  Truck,
  Package,
  Radio,
  Send,
  Activity,
  CheckCircle2,
  Maximize2,
  QrCode,
  Smartphone,
  Navigation as NavIcon,
  ShieldCheck,
  Volume2,
  VolumeX,
  RefreshCw,
} from 'lucide-react';

interface TelemetryPing {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

// Sound effects using native Web Audio API (zero external asset dependencies)
function playDispatchChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ignore audio restrictions
  }
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverLocations, setDriverLocations] = useState<Record<string, TelemetryPing>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [eventLogs, setEventLogs] = useState<{ id: string; time: string; text: string; type: 'telemetry' | 'order' | 'dispatch' }[]>([]);
  const [isLiveTelemetryActive, setIsLiveTelemetryActive] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pingCount, setPingCount] = useState(0);

  const loadData = async () => {
    try {
      const [ordersData, driversData] = await Promise.all([fetchOrders(), fetchDrivers()]);
      setOrders(ordersData);
      setDrivers(driversData);

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
      setPingCount((c) => c + 1);

      setEventLogs((prev) => [
        {
          id: Math.random().toString(),
          time: new Date(data.timestamp).toLocaleTimeString(),
          text: `Captain ${data.driverId} live coordinates: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)} (${(data.speed || 0).toFixed(0)} km/h)`,
          type: 'telemetry',
        },
        ...prev.slice(0, 14),
      ]);
    };

    // 3. Order Lifecycle Listeners
    const handleOrderCreated = (order: Order) => {
      if (soundEnabled) playDispatchChime();
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      setEventLogs((prev) => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString(),
          text: `📦 Ingested order #${order.trackingCode} (${order.pickupAddress.slice(0, 15)} ➔ ${order.dropoffAddress.slice(0, 15)})`,
          type: 'order',
        },
        ...prev.slice(0, 14),
      ]);
    };

    const handleOrderStatusUpdated = (order: Order) => {
      if (soundEnabled) playDispatchChime();
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...order } : o)));
      setEventLogs((prev) => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString(),
          text: `⚡ Order #${order.trackingCode} transitioned to ${order.status}`,
          type: 'dispatch',
        },
        ...prev.slice(0, 14),
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
  }, [soundEnabled]);

  const handleManualAssign = async (orderId: string, driverId: string) => {
    setAssigningId(orderId);
    try {
      const updated = await assignOrder(orderId, driverId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (soundEnabled) playDispatchChime();
    } catch (err) {
      console.error('Failed to assign order:', err);
    } finally {
      setAssigningId(null);
    }
  };

  const unassignedOrders = orders.filter((o) => o.status === 'PENDING');
  const inTransitOrders = orders.filter((o) => o.status === 'IN_TRANSIT');
  const assignedOrders = orders.filter((o) => o.status === 'ASSIGNED');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

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

  const activeMapOrder = selectedOrder || unassignedOrders[0] || inTransitOrders[0] || orders[0];

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col bg-[#00052e] text-white selection:bg-[#0428cb]">
      {/* Top Operations Command Ribbon */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#131e5c] bg-[#02093a]/95 px-6 py-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34fcff] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#34fcff]"></span>
            </span>
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold tracking-wider text-white">
                DOHA OPERATIONS CENTER
              </span>
              <span className="font-mono text-[9px] tracking-widest text-[#8185a0]">
                ZEEGO FLEET DISPATCH · QATAR
              </span>
            </div>
          </div>

          <div className="hidden md:block h-6 w-[1px] bg-[#131e5c]" />

          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center gap-5 text-xs font-mono">
            <div className="flex items-center gap-2 rounded-[6px] bg-[#00052e] px-2.5 py-1 border border-[#131e5c]">
              <span className="text-[#6b6b83]">ONLINE:</span>
              <span className="text-[#34fcff] font-bold">{drivers.length} RIDERS</span>
            </div>
            <div className="flex items-center gap-2 rounded-[6px] bg-[#00052e] px-2.5 py-1 border border-[#131e5c]">
              <span className="text-[#6b6b83]">PENDING:</span>
              <span className="text-[#f59e0b] font-bold">{unassignedOrders.length}</span>
            </div>
            <div className="flex items-center gap-2 rounded-[6px] bg-[#00052e] px-2.5 py-1 border border-[#131e5c]">
              <span className="text-[#6b6b83]">IN TRANSIT:</span>
              <span className="text-[#34fcff] font-bold">{inTransitOrders.length}</span>
            </div>
            <div className="flex items-center gap-2 rounded-[6px] bg-[#00052e] px-2.5 py-1 border border-[#131e5c]">
              <span className="text-[#6b6b83]">COMPLETED:</span>
              <span className="text-[#10b981] font-bold">{deliveredOrders.length}</span>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPhoneModal(true)}
            className="flex items-center gap-2 rounded-[8px] border border-[#34fcff]/60 bg-[#0428cb]/30 px-3.5 py-1.5 font-mono text-xs font-semibold text-[#34fcff] shadow-cyan-glow transition-all hover:bg-[#0428cb]/60 hover:scale-105"
          >
            <Smartphone className="h-4 w-4 text-[#34fcff]" />
            <span>TEST ON PHONE (QR)</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-[6px] border border-[#131e5c] bg-[#00052e] p-2 text-[#8185a0] hover:text-white"
            title={soundEnabled ? 'Mute Dispatch Chimes' : 'Enable Dispatch Chimes'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-[#34fcff]" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            onClick={loadData}
            className="rounded-[6px] border border-[#131e5c] bg-[#00052e] p-2 text-[#8185a0] hover:text-white"
            title="Refresh Fleet Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Command Workspace */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Fullscreen Map Area */}
        <div className="relative flex-1 bg-[#00052e]">
          <MapboxMap
            center={[51.5310, 25.3280]}
            zoom={12.8}
            pitch={35}
            bearing={10}
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

          {/* Floating Driver HUD Card (Ameba midnight style) */}
          {activeDriver && (
            <div className="absolute top-5 left-5 z-10 w-80 rounded-[10px] border border-[#34fcff]/30 bg-[#00052e]/90 p-4 backdrop-blur-xl shadow-2xl shadow-[#0428cb]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#10b981] animate-pulse" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#34fcff]">
                    ACTIVE RIDER UNIT · 01
                  </span>
                </div>
                <span className="rounded-[4px] border border-[#0428cb] bg-[#0428cb]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                  {activeDriver.status}
                </span>
              </div>

              <div className="mt-2 text-base font-bold text-white">{activeDriver.name}</div>
              <div className="font-mono text-xs text-[#8185a0]">{activeDriver.vehicle}</div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#131e5c] pt-2.5 font-mono text-xs">
                <div className="rounded-[6px] bg-[#02093a] p-2 border border-[#131e5c]">
                  <span className="text-[#6b6b83] text-[10px]">SPEED:</span>
                  <div className="text-base font-bold text-[#34fcff]">
                    {(driverLocations[activeDriver.id]?.speed ?? 0).toFixed(0)} <span className="text-[10px] text-white">KM/H</span>
                  </div>
                </div>

                <div className="rounded-[6px] bg-[#02093a] p-2 border border-[#131e5c]">
                  <span className="text-[#6b6b83] text-[10px]">HEADING:</span>
                  <div className="text-base font-bold text-[#afb4db]">
                    {(driverLocations[activeDriver.id]?.heading ?? 0).toFixed(0)}°
                  </div>
                </div>

                <div className="col-span-2 rounded-[6px] bg-[#02093a] p-2 border border-[#131e5c] text-[11px] truncate">
                  <span className="text-[#6b6b83]">COORDINATES: </span>
                  <span className="text-[#34fcff]">
                    {driverLocations[activeDriver.id]?.lat.toFixed(5) ?? activeDriver.currentLat.toFixed(5)},{' '}
                    {driverLocations[activeDriver.id]?.lng.toFixed(5) ?? activeDriver.currentLng.toFixed(5)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Floating Map Legend Indicator */}
          <div className="absolute bottom-5 left-5 z-10 flex items-center gap-3 rounded-[8px] border border-[#131e5c] bg-[#00052e]/90 px-3.5 py-2 backdrop-blur-md font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#34fcff] shadow-cyan-glow" />
              <span className="text-[#afb4db]">Driver</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
              <span className="text-[#afb4db]">Pickup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
              <span className="text-[#afb4db]">Dropoff</span>
            </div>
          </div>
        </div>

        {/* Right Operations Side Drawer */}
        <div className="flex w-[420px] flex-col border-l border-[#131e5c] bg-[#02093a]/95 backdrop-blur-xl">
          {/* Header */}
          <div className="border-b border-[#131e5c] p-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-wide text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-[#34fcff]" />
                <span>ACTIVE DISPATCH QUEUE</span>
              </h2>
              <p className="font-mono text-[10px] text-[#6b6b83] mt-0.5">
                REAL-TIME ORDERS REQUIRING ALLOCATION
              </p>
            </div>
            <span className="rounded-full bg-[#f59e0b]/20 px-2.5 py-0.5 font-mono text-xs font-bold text-[#f59e0b]">
              {unassignedOrders.length} PENDING
            </span>
          </div>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {unassignedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[#131e5c] p-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-[#10b981] mb-3 shadow-sm" />
                <span className="text-sm font-semibold text-white">Fleet Fully Dispatched</span>
                <p className="mt-1 font-mono text-xs text-[#8185a0] max-w-xs">
                  No unassigned orders in Doha queue. Use the Command Hub to trigger a new delivery.
                </p>
              </div>
            ) : (
              unassignedOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`cursor-pointer rounded-[10px] border p-4 transition-all ${
                      isSelected
                        ? 'border-[#34fcff] bg-[#0428cb]/25 shadow-cyan-glow'
                        : 'border-[#131e5c] bg-[#00052e]/80 hover:border-[#0428cb] hover:bg-[#00052e]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#34fcff] tracking-wider">
                        #{order.trackingCode}
                      </span>
                      <span className="rounded-[4px] bg-[#f59e0b]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#f59e0b]">
                        PENDING
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-semibold text-white">{order.customerName}</div>
                    <div className="text-xs text-[#afb4db] truncate">{order.itemsDescription}</div>

                    <div className="mt-3 space-y-1.5 text-xs font-mono border-t border-[#131e5c] pt-2.5">
                      <div className="flex items-start gap-2">
                        <span className="rounded bg-[#10b981]/20 px-1 py-0.5 text-[9px] font-bold text-[#10b981]">
                          ORIGIN
                        </span>
                        <span className="text-white truncate">{order.pickupAddress}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="rounded bg-[#ef4444]/20 px-1 py-0.5 text-[9px] font-bold text-[#ef4444]">
                          DEST
                        </span>
                        <span className="text-white truncate">{order.dropoffAddress}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#131e5c]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (drivers[0]) handleManualAssign(order.id, drivers[0].id);
                        }}
                        disabled={assigningId === order.id || drivers.length === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#0428cb] to-[#0428cb]/80 py-2.5 text-xs font-bold tracking-wider text-white shadow-blue-glow transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5 text-[#34fcff]" />
                        <span>
                          {assigningId === order.id ? 'DISPATCHING...' : 'DISPATCH TO CAPTAIN TARIQ'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Telemetry Log Stream */}
          <div className="h-52 border-t border-[#131e5c] bg-[#00052e] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-[#34fcff]" />
                <span className="font-mono text-xs font-bold text-[#afb4db]">
                  LIVE EVENT BUS ({pingCount} PINGS)
                </span>
              </div>
              <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px]">
              {eventLogs.length === 0 ? (
                <div className="text-[#6b6b83] italic">Listening on WebSocket pipeline...</div>
              ) : (
                eventLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-snug">
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

      <PhoneConnectModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} />
    </div>
  );
}
