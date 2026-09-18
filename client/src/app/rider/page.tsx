'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { Order } from '@/lib/api';
import { MapboxMap } from '@/components/MapboxMap';
import { PhoneConnectModal } from '@/components/PhoneConnectModal';
import {
  Truck,
  CheckCircle2,
  Play,
  Square,
  Radio,
  MapPin,
  QrCode,
  Smartphone,
  Navigation as NavIcon,
  Compass,
  Zap,
} from 'lucide-react';

// Waypoints representing a realistic Doha delivery corridor along the Corniche to The Pearl:
const DOHA_SIMULATION_WAYPOINTS: [number, number][] = [
  [51.5333, 25.2867], // Souq Waqif
  [51.5345, 25.2910],
  [51.5320, 25.2980], // Corniche South
  [51.5280, 25.3050],
  [51.5260, 25.3120], // Corniche Center
  [51.5298, 25.3223], // West Bay Highrises
  [51.5280, 25.3340],
  [51.5250, 25.3450], // City Center Doha
  [51.5240, 25.3570], // Katara Cultural Village
  [51.5350, 25.3640], // Pearl Bridge Causeway
  [51.5478, 25.3713], // The Pearl-Qatar, Porto Arabia
];

export default function RiderCockpitPage() {
  const [driverId] = useState('driver_1');
  const [driverName] = useState('Captain Tariq Al-Mansoor');

  // Rider State Machine: 1 = WAITING, 2 = RECEIVED, 3 = IN_TRANSIT
  const [riderState, setRiderState] = useState<1 | 2 | 3>(1);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // GPS Telemetry State
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; heading: number; speed: number }>({
    lat: 25.3223,
    lng: 51.5298,
    heading: 45,
    speed: 0,
  });

  // Simulator State
  const [isSimulating, setIsSimulating] = useState(false);
  const [gpsMode, setGpsMode] = useState<'sim' | 'hardware'>('sim');
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
      setRiderState(2); // State 2: Order Received
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
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setGpsMode('hardware');
    stopSimulation();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: (position.coords.speed || 0) * 3.6,
        };
        setCurrentCoords(coords);
        emitLocationPing(coords.lat, coords.lng, coords.heading, coords.speed);
      },
      (error) => {
        console.warn('[RIDER] Geolocation error:', error.message);
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

  // Automated Route Simulator
  const startSimulation = () => {
    setIsSimulating(true);
    setGpsMode('sim');
    stopHardwareGPS();

    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    simIntervalRef.current = setInterval(() => {
      simStepRef.current = (simStepRef.current + 1) % DOHA_SIMULATION_WAYPOINTS.length;
      const [lng, lat] = DOHA_SIMULATION_WAYPOINTS[simStepRef.current];

      const nextIdx = (simStepRef.current + 1) % DOHA_SIMULATION_WAYPOINTS.length;
      const [nextLng, nextLat] = DOHA_SIMULATION_WAYPOINTS[nextIdx];
      const heading = Math.atan2(nextLng - lng, nextLat - lat) * (180 / Math.PI);

      const newCoords = {
        lat,
        lng,
        heading: (heading + 360) % 360,
        speed: 46 + Math.random() * 6,
      };

      setCurrentCoords(newCoords);
      emitLocationPing(newCoords.lat, newCoords.lng, newCoords.heading, newCoords.speed);
    }, 2000);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  };

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
    <div className="min-h-[calc(100vh-4rem)] bg-md-surface px-4 py-8 sm:px-6 lg:px-8 text-md-on-surface transition-colors duration-300">
      <div className="mx-auto flex max-w-5xl flex-col lg:flex-row items-center justify-center gap-8">
        {/* Left Side: Desktop Companion Information (Material You Surface Card) */}
        <div className="hidden lg:flex w-80 flex-col space-y-4">
          <div className="rounded-[28px] border border-md-outline/15 bg-md-surface-container p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-md-primary">
              <Smartphone className="h-4 w-4" />
              <span>TEST ON YOUR PHONE</span>
            </div>
            <p className="mt-2 text-xs text-md-on-surface-variant leading-relaxed">
              Scan the QR code to open this cockpit on your mobile device. Stream real GPS telemetry while walking or trigger the Doha Corniche simulator!
            </p>
            <button
              onClick={() => setShowPhoneModal(true)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-md-primary py-2.5 text-xs font-medium text-md-on-primary shadow-sm hover:shadow-md hover:bg-md-primary/90 active:scale-95 transition-all"
            >
              <QrCode className="h-4 w-4" />
              <span>SHOW PHONE QR CODE</span>
            </button>
          </div>

          <div className="rounded-[28px] border border-md-outline/15 bg-md-surface-container p-6 text-xs text-md-on-surface-variant space-y-3 shadow-sm">
            <div className="text-md-on-surface font-bold">TELEMETRY DIAGNOSTIC</div>
            <div className="flex justify-between border-t border-md-outline/10 pt-2 font-mono">
              <span>CAPTAIN:</span>
              <span className="text-md-on-surface font-semibold">{driverName}</span>
            </div>
            <div className="flex justify-between border-t border-md-outline/10 pt-2 font-mono">
              <span>VEHICLE:</span>
              <span className="text-md-on-surface">Yamaha MT-07</span>
            </div>
            <div className="flex justify-between border-t border-md-outline/10 pt-2 font-mono">
              <span>GPS STREAM:</span>
              <span className={isSimulating ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-md-primary font-bold'}>
                {isSimulating ? 'SIM CORNICHE (2s)' : gpsMode === 'hardware' ? 'HARDWARE PHONE' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mobile Device Phone Frame (Material You Aesthetics) */}
        <div className="relative w-full max-w-sm rounded-[36px] border-4 border-md-outline/20 bg-md-surface shadow-2xl overflow-hidden flex flex-col h-[740px]">
          {/* Mobile Top Status Notch */}
          <div className="flex items-center justify-between border-b border-md-outline/15 bg-md-surface-container px-5 py-3 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-md-on-surface text-[11px]">ZEEGO CAPTAIN</span>
            </div>
            <span className="font-mono text-[10px] text-md-primary font-semibold">DOHA HQ · 5G</span>
          </div>

          {/* Map Top 55% */}
          <div className="relative h-[340px] w-full border-b border-md-outline/15">
            <MapboxMap
              center={[currentCoords.lng, currentCoords.lat]}
              zoom={13.5}
              pitch={40}
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
              followDriver={true}
            />

            {/* Speedometer Overlay (Material You Tonal Surface) */}
            <div className="absolute top-3 left-3 rounded-2xl border border-md-outline/15 bg-md-surface-container/90 p-2.5 backdrop-blur-md shadow-md">
              <span className="font-mono text-[9px] text-md-on-surface-variant">SPEED</span>
              <div className="font-mono text-xl font-bold text-md-primary">
                {currentCoords.speed.toFixed(0)} <span className="text-[10px] text-md-on-surface">KM/H</span>
              </div>
            </div>

            {/* Simulation / Hardware GPS Toggle (Material You Pills) */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
              <button
                onClick={isSimulating ? stopSimulation : startSimulation}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold shadow-md transition-all active:scale-95 ${
                  isSimulating
                    ? 'bg-emerald-500 text-white'
                    : 'bg-md-primary text-md-on-primary hover:bg-md-primary/90'
                }`}
              >
                {isSimulating ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span>{isSimulating ? 'STOP SIM' : 'AUTO DRIVE'}</span>
              </button>

              <button
                onClick={startHardwareGPS}
                className="flex items-center gap-1.5 rounded-full border border-md-outline/25 bg-md-surface/90 px-3 py-1 font-mono text-[9px] text-md-on-surface hover:bg-md-surface-low"
              >
                <Compass className="h-2.5 w-2.5 text-md-primary" />
                <span>USE PHONE GPS</span>
              </button>
            </div>
          </div>

          {/* Bottom Cockpit Controls (Material You Surface Container) */}
          <div className="flex flex-1 flex-col justify-between bg-md-surface-container p-5">
            {/* STATE 1: Waiting */}
            {riderState === 1 && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
                  <div className="radar-ping absolute inset-0 rounded-full bg-md-primary/20" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-md-primary shadow-md">
                    <Radio className="h-7 w-7 text-md-on-primary animate-pulse" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-md-on-surface">Standing by in West Bay</h3>
                <p className="mt-1 text-xs text-md-on-surface-variant max-w-[240px] leading-relaxed">
                  Listening for real-time dispatch offers. Click "Manual Assign" on the Admin tab or test the driving simulator!
                </p>

                <div className="mt-4 w-full rounded-2xl border border-md-outline/15 bg-md-surface p-3.5 text-left shadow-sm">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-md-primary font-bold">
                    <Zap className="h-3.5 w-3.5" />
                    <span>INSTANT DEMO TRIGGER:</span>
                  </div>
                  <p className="mt-1 text-[11px] text-md-on-surface-variant">
                    Tap below to start simulated telemetry along Doha Corniche to The Pearl-Qatar!
                  </p>
                  <button
                    onClick={startSimulation}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-md-secondary-container hover:bg-md-secondary-container/80 text-md-on-secondary-container py-2 text-xs font-medium active:scale-95 transition-all shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5 text-md-primary" />
                    <span>TEST CORNICHE GPS SIMULATOR</span>
                  </button>
                </div>
              </div>
            )}

            {/* STATE 2: Order Received */}
            {riderState === 2 && activeOrder && (
              <div className="flex flex-1 flex-col justify-between animate-fadeIn">
                <div className="rounded-2xl border-2 border-md-primary bg-md-surface p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-md-outline/10 pb-2">
                    <span className="font-mono text-xs font-bold text-md-primary">
                      DISPATCH OFFER
                    </span>
                    <span className="font-mono text-xs text-md-on-surface">#{activeOrder.trackingCode}</span>
                  </div>

                  <div className="mt-2.5 text-sm font-bold text-md-on-surface">{activeOrder.customerName}</div>
                  <div className="text-xs text-md-on-surface-variant truncate">{activeOrder.itemsDescription}</div>

                  <div className="mt-3 space-y-1.5 text-xs font-mono border-t border-md-outline/10 pt-2.5">
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">A:</span>
                      <span className="text-md-on-surface truncate">{activeOrder.pickupAddress}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-md-tertiary font-bold">B:</span>
                      <span className="text-md-on-surface truncate">{activeOrder.dropoffAddress}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAcceptOrder}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-md-primary py-3.5 text-xs font-medium text-md-on-primary shadow-md hover:bg-md-primary/90 transition-all active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>ACCEPT DELIVERY ORDER</span>
                </button>
              </div>
            )}

            {/* STATE 3: In Transit */}
            {riderState === 3 && activeOrder && (
              <div className="flex flex-1 flex-col justify-between animate-fadeIn">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-md-primary" />
                      <span className="font-mono text-xs font-bold text-md-on-surface">MISSION ACTIVE</span>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      {activeOrder.status}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-md-outline/15 bg-md-surface p-4 font-mono text-xs space-y-2.5 shadow-sm">
                    <div className="flex justify-between">
                      <span className="text-md-on-surface-variant">PARCEL:</span>
                      <span className="text-md-on-surface font-semibold">#{activeOrder.trackingCode}</span>
                    </div>
                    <div className="flex justify-between border-t border-md-outline/10 pt-2">
                      <span className="text-md-on-surface-variant">DESTINATION:</span>
                      <span className="text-md-on-surface truncate max-w-[150px] font-semibold">{activeOrder.dropoffAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {activeOrder.status === 'ASSIGNED' ? (
                    <button
                      onClick={handlePickedUp}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-md-primary py-3.5 text-xs font-medium text-md-on-primary shadow-sm hover:shadow-md hover:bg-md-primary/90 active:scale-95 transition-all"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>CONFIRM PARCEL PICKED UP</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleDelivered}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3.5 text-xs font-medium text-white shadow-sm hover:shadow-md hover:bg-emerald-500 active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>CONFIRM DROP-OFF (DELIVERED)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PhoneConnectModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} />
    </div>
  );
}
