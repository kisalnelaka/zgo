'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { Order, OrderStatus } from '@/lib/api';
import { MapboxMap } from '@/components/MapboxMap';
import {
  Truck,
  CheckCircle2,
  Navigation as NavIcon,
  Play,
  Square,
  Radio,
  MapPin,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

// Waypoint coordinates representing a realistic Doha delivery corridor:
// From Souq Waqif (25.2867, 51.5333) -> Corniche -> West Bay (25.3223, 51.5298) -> Katara (25.3570, 51.5240) -> The Pearl-Qatar (25.3713, 51.5478)
const DOHA_SIMULATION_WAYPOINTS: [number, number][] = [
  [51.5333, 25.2867], // Souq Waqif
  [51.5345, 25.2910],
  [51.5320, 25.2980], // Corniche South
  [51.5280, 25.3050],
  [51.5260, 25.3120], // Corniche Center
  [51.5298, 25.3223], // West Bay Highrises
  [51.5280, 25.3340],
  [51.5250, 25.3450], // Near City Center
  [51.5240, 25.3570], // Katara Cultural Village
  [51.5350, 25.3640], // Pearl Bridge Causeway
  [51.5478, 25.3713], // The Pearl-Qatar, Porto Arabia
];

export default function RiderCockpitPage() {
  const [driverId] = useState('driver_1');
  const [driverName] = useState('Tariq Al-Mansoor');

  // Rider State Machine: 1 = WAITING, 2 = RECEIVED, 3 = IN_TRANSIT
  const [riderState, setRiderState] = useState<1 | 2 | 3>(1);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // GPS Telemetry State
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; heading: number; speed: number }>({
    lat: 25.3223,
    lng: 51.5298,
    heading: 45,
    speed: 0,
  });

  // Simulator State
  const [isSimulating, setIsSimulating] = useState(false);
  const simStepRef = useRef(0);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const socket = getSocket();

    // Join driver room
    socket.emit('join:driver', driverId);

    // Listen for order dispatch from server/admin
    const handleOrderDispatch = (data: { order: Order; driverId: string }) => {
      console.log('[RIDER] Received order dispatch offer:', data.order);
      setActiveOrder(data.order);
      setRiderState(2); // Transition to State 2: Order Received
    };

    socket.on('order_dispatch', handleOrderDispatch);

    return () => {
      socket.off('order_dispatch', handleOrderDispatch);
      stopSimulation();
      stopHardwareGPS();
    };
  }, [driverId]);

  // Hardware Geolocation Watcher
  const startHardwareGPS = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: (position.coords.speed || 0) * 3.6, // m/s to km/h
        };
        setCurrentCoords(coords);
        emitLocationPing(coords.lat, coords.lng, coords.heading, coords.speed);
      },
      (error) => {
        console.warn('[RIDER] Geolocation error / denied:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
  };

  const stopHardwareGPS = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Emit ping to Socket.io (which writes to Redis and broadcasts to Admin & Customer)
  const emitLocationPing = (lat: number, lng: number, heading: number, speed: number) => {
    const socket = getSocket();
    socket.emit('ping_location', {
      driverId,
      lat,
      lng,
      heading,
      speed,
      orderId: activeOrder?.id || activeOrder?.trackingCode,
      timestamp: Date.now(),
    });
  };

  // Automated Route Simulator for portfolio evaluation
  const startSimulation = () => {
    setIsSimulating(true);
    stopHardwareGPS();

    simIntervalRef.current = setInterval(() => {
      simStepRef.current = (simStepRef.current + 1) % DOHA_SIMULATION_WAYPOINTS.length;
      const [lng, lat] = DOHA_SIMULATION_WAYPOINTS[simStepRef.current];

      // Calculate approximate heading to next point
      const nextIdx = (simStepRef.current + 1) % DOHA_SIMULATION_WAYPOINTS.length;
      const [nextLng, nextLat] = DOHA_SIMULATION_WAYPOINTS[nextIdx];
      const heading = Math.atan2(nextLng - lng, nextLat - lat) * (180 / Math.PI);

      const newCoords = {
        lat,
        lng,
        heading: (heading + 360) % 360,
        speed: 42 + Math.random() * 8, // Realistic 42-50 km/h motorcycle speed
      };

      setCurrentCoords(newCoords);
      emitLocationPing(newCoords.lat, newCoords.lng, newCoords.heading, newCoords.speed);
    }, 2000); // 2 second high-frequency ticks
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  };

  // Driver Actions
  const handleAcceptOrder = () => {
    if (!activeOrder) return;
    const socket = getSocket();
    socket.emit('status_change', {
      orderId: activeOrder.id,
      driverId,
      status: 'ASSIGNED',
    });
    setRiderState(3); // Enter State 3: In Transit
    startSimulation(); // Start streaming GPS
  };

  const handlePickedUp = () => {
    if (!activeOrder) return;
    const socket = getSocket();
    socket.emit('status_change', {
      orderId: activeOrder.id,
      driverId,
      status: 'IN_TRANSIT',
    });
    setActiveOrder((prev) => (prev ? { ...prev, status: 'IN_TRANSIT' } : null));
  };

  const handleDelivered = () => {
    if (!activeOrder) return;
    const socket = getSocket();
    socket.emit('status_change', {
      orderId: activeOrder.id,
      driverId,
      status: 'DELIVERED',
    });
    stopSimulation();
    setRiderState(1); // Back to State 1: Waiting
    setActiveOrder(null);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col bg-[#00052e] border-x border-[#131e5c] text-white">
      {/* Rider Terminal Header */}
      <div className="flex items-center justify-between border-b border-[#131e5c] bg-[#02093a] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="font-mono text-xs font-semibold tracking-wider text-white">
            CAPTAIN COCKPIT · ZEEGO
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#34fcff]">{driverName}</span>
      </div>

      {/* Embedded High-Contrast Navigation Map */}
      <div className="relative h-64 w-full border-b border-[#131e5c]">
        <MapboxMap
          center={[currentCoords.lng, currentCoords.lat]}
          zoom={13}
          driverCoords={currentCoords}
          pickupCoords={
            activeOrder
              ? { lat: activeOrder.pickupLat, lng: activeOrder.pickupLng, label: activeOrder.pickupAddress }
              : null
          }
          dropoffCoords={
            activeOrder
              ? { lat: activeOrder.dropoffLat, lng: activeOrder.dropoffLng, label: activeOrder.dropoffAddress }
              : null
          }
          routeCoordinates={DOHA_SIMULATION_WAYPOINTS}
        />

        {/* Live Speedometer HUD */}
        <div className="absolute top-3 left-3 rounded-[6px] border border-[#131e5c] bg-[#00052e]/90 px-3 py-1.5 backdrop-blur-md">
          <span className="font-mono text-[10px] text-[#6b6b83]">SPEED</span>
          <div className="font-mono text-base font-bold text-[#34fcff]">
            {currentCoords.speed.toFixed(0)} <span className="text-[10px] text-white">KM/H</span>
          </div>
        </div>

        {/* Live Simulation Control Badge */}
        <div className="absolute top-3 right-3">
          <button
            onClick={isSimulating ? stopSimulation : startSimulation}
            className={`flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1 font-mono text-[10px] transition-all ${
              isSimulating
                ? 'border-[#10b981] bg-[#10b981]/20 text-[#10b981]'
                : 'border-[#34fcff]/50 bg-[#0428cb]/40 text-[#34fcff]'
            }`}
          >
            {isSimulating ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>{isSimulating ? 'SIM ACTIVE (DOHA)' : 'RUN SIMULATION'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Lifecycle Views */}
      <div className="flex flex-1 flex-col justify-between p-5">
        {/* STATE 1: Waiting for Orders */}
        {riderState === 1 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
              <div className="radar-ping absolute inset-0 rounded-full bg-[#0428cb]/30" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0428cb] shadow-blue-glow">
                <Radio className="h-8 w-8 text-[#34fcff] animate-pulse" />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-white">Scanning for Orders</h2>
            <p className="mt-2 max-w-xs text-xs text-[#8185a0]">
              Standing by in West Bay, Doha. Listening for server dispatch offers via WebSocket.
            </p>

            <div className="mt-6 rounded-[8px] border border-[#131e5c] bg-[#02093a] p-4 text-left w-full">
              <div className="flex items-center gap-2 text-xs font-mono text-[#afb4db]">
                <ShieldAlert className="h-4 w-4 text-[#34fcff]" />
                <span>PORTFOLIO DEMO HELPER:</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-[#6b6b83]">
                Switch to the <strong>Command Hub</strong> or <strong>Admin Ops</strong> tab to click "Manual Assign to Tariq" or trigger an instant order!
              </p>
            </div>
          </div>
        )}

        {/* STATE 2: Order Received (Accept CTA) */}
        {riderState === 2 && activeOrder && (
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#34fcff] animate-ping" />
                  <span className="font-mono text-xs font-bold text-[#34fcff]">
                    NEW DISPATCH OFFER
                  </span>
                </div>
                <span className="font-mono text-xs text-[#8185a0]">
                  #{activeOrder.trackingCode}
                </span>
              </div>

              <div className="rounded-[8px] border border-[#34fcff] bg-[#02093a] p-4 shadow-cyan-glow">
                <div className="text-sm font-semibold text-white">{activeOrder.customerName}</div>
                <div className="text-xs text-[#afb4db]">{activeOrder.itemsDescription}</div>

                <div className="mt-4 space-y-2 border-t border-[#131e5c] pt-3 font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-[#10b981] font-bold">PICKUP:</span>
                    <span className="text-white">{activeOrder.pickupAddress}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#ef4444] font-bold">DROPOFF:</span>
                    <span className="text-white">{activeOrder.dropoffAddress}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleAcceptOrder}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#0428cb] py-4 text-sm font-semibold tracking-wider text-white shadow-blue-glow transition-all hover:bg-[#0428cb]/90"
            >
              <CheckCircle2 className="h-5 w-5 text-[#34fcff]" />
              <span>ACCEPT DELIVERY ORDER</span>
            </button>
          </div>
        )}

        {/* STATE 3: In Transit */}
        {riderState === 3 && activeOrder && (
          <div className="flex flex-1 flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#34fcff]" />
                  <span className="font-mono text-xs font-bold text-white">
                    MISSION IN PROGRESS
                  </span>
                </div>
                <span className="rounded-[4px] bg-[#10b981]/20 px-2 py-0.5 font-mono text-[10px] text-[#10b981]">
                  {activeOrder.status}
                </span>
              </div>

              <div className="rounded-[8px] border border-[#131e5c] bg-[#02093a] p-4 font-mono text-xs space-y-3">
                <div>
                  <span className="text-[#6b6b83]">ORDER TRACKING:</span>
                  <div className="text-[#34fcff] font-bold">{activeOrder.trackingCode}</div>
                </div>

                <div className="border-t border-[#131e5c] pt-2">
                  <span className="text-[#6b6b83]">TARGET DESTINATION:</span>
                  <div className="text-white truncate">{activeOrder.dropoffAddress}</div>
                </div>

                <div className="border-t border-[#131e5c] pt-2">
                  <span className="text-[#6b6b83]">LIVE TELEMETRY STREAM:</span>
                  <div className="text-[#afb4db]">
                    {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)} · {currentCoords.speed.toFixed(0)} km/h
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {activeOrder.status === 'ASSIGNED' ? (
                <button
                  onClick={handlePickedUp}
                  className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#0428cb] py-3.5 text-xs font-semibold text-white transition-all hover:bg-[#0428cb]/80"
                >
                  <MapPin className="h-4 w-4 text-[#34fcff]" />
                  <span>CONFIRM PARCEL PICKED UP</span>
                </button>
              ) : (
                <button
                  onClick={handleDelivered}
                  className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#10b981] py-3.5 text-xs font-semibold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:bg-[#10b981]/90"
                >
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>COMPLETE DROP-OFF (DELIVERED)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
