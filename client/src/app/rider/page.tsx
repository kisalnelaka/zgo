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
  Volume2,
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
    <div className="min-h-[calc(100vh-4rem)] bg-[#00052e] px-4 py-6 sm:px-6 lg:px-8 text-white">
      <div className="mx-auto flex max-w-5xl flex-col lg:flex-row items-center justify-center gap-8">
        {/* Left Side: Desktop Companion Information & QR Code */}
        <div className="hidden lg:flex w-80 flex-col space-y-4">
          <div className="rounded-[12px] border border-[#131e5c] bg-[#02093a]/80 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-[#34fcff] font-mono">
              <Smartphone className="h-4 w-4" />
              <span>TEST ON YOUR MOBILE</span>
            </div>
            <p className="mt-2 text-xs text-[#8185a0] leading-relaxed">
              Install this PWA on your phone. You can walk around Doha or tap simulation mode, and watch your laptop screen track you live!
            </p>
            <button
              onClick={() => setShowPhoneModal(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[8px] border border-[#34fcff]/50 bg-[#0428cb]/30 py-2.5 text-xs font-bold text-[#34fcff] shadow-cyan-glow hover:bg-[#0428cb]/50"
            >
              <QrCode className="h-4 w-4" />
              <span>SHOW PHONE QR CODE</span>
            </button>
          </div>

          <div className="rounded-[12px] border border-[#131e5c] bg-[#02093a]/80 p-5 font-mono text-xs text-[#afb4db] space-y-3">
            <div className="text-white font-semibold">STATUS & TELEMETRY</div>
            <div className="flex justify-between border-t border-[#131e5c] pt-2">
              <span className="text-[#6b6b83]">CAPTAIN:</span>
              <span className="text-white">Tariq Al-Mansoor</span>
            </div>
            <div className="flex justify-between border-t border-[#131e5c] pt-2">
              <span className="text-[#6b6b83]">VEHICLE:</span>
              <span className="text-white">Yamaha MT-07</span>
            </div>
            <div className="flex justify-between border-t border-[#131e5c] pt-2">
              <span className="text-[#6b6b83]">GPS STREAM:</span>
              <span className={isSimulating ? 'text-[#10b981]' : 'text-[#34fcff]'}>
                {isSimulating ? 'SIM ACTIVE (2s)' : gpsMode === 'hardware' ? 'HARDWARE PHONE' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mobile Device Phone Frame */}
        <div className="relative w-full max-w-sm rounded-[24px] border-4 border-[#131e5c] bg-[#00052e] shadow-2xl shadow-[#0428cb]/20 overflow-hidden flex flex-col h-[740px]">
          {/* Mobile Top Status Notch */}
          <div className="flex items-center justify-between border-b border-[#131e5c] bg-[#02093a] px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-bold text-white text-[11px]">ZEEGO CAPTAIN</span>
            </div>
            <span className="font-mono text-[10px] text-[#34fcff]">DOHA HQ · 5G</span>
          </div>

          {/* Map Top 55% */}
          <div className="relative h-[340px] w-full border-b border-[#131e5c]">
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

            {/* Speedometer Overlay */}
            <div className="absolute top-3 left-3 rounded-[8px] border border-[#131e5c] bg-[#00052e]/90 p-2.5 backdrop-blur-md shadow-md">
              <span className="font-mono text-[9px] text-[#6b6b83]">SPEED</span>
              <div className="font-mono text-xl font-bold text-[#34fcff]">
                {currentCoords.speed.toFixed(0)} <span className="text-[10px] text-white">KM/H</span>
              </div>
            </div>

            {/* Simulation / Hardware GPS Toggle */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
              <button
                onClick={isSimulating ? stopSimulation : startSimulation}
                className={`flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 font-mono text-[10px] font-bold shadow-md transition-all ${
                  isSimulating
                    ? 'border-[#10b981] bg-[#10b981]/25 text-[#10b981]'
                    : 'border-[#34fcff]/60 bg-[#0428cb]/40 text-[#34fcff]'
                }`}
              >
                {isSimulating ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span>{isSimulating ? 'STOP SIM' : 'AUTO DRIVE'}</span>
              </button>

              <button
                onClick={startHardwareGPS}
                className="flex items-center gap-1.5 rounded-[8px] border border-[#131e5c] bg-[#00052e]/90 px-2.5 py-1 font-mono text-[9px] text-[#afb4db] hover:text-white"
              >
                <Compass className="h-2.5 w-2.5 text-[#34fcff]" />
                <span>USE PHONE GPS</span>
              </button>
            </div>
          </div>

          {/* Bottom Cockpit Controls */}
          <div className="flex flex-1 flex-col justify-between bg-[#02093a]/90 p-4">
            {/* STATE 1: Waiting */}
            {riderState === 1 && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                  <div className="radar-ping absolute inset-0 rounded-full bg-[#0428cb]/40" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#0428cb] shadow-cyan-glow">
                    <Radio className="h-7 w-7 text-[#34fcff] animate-pulse" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">Standing by in West Bay</h3>
                <p className="mt-1 font-mono text-[11px] text-[#8185a0] max-w-[240px]">
                  Listening for real-time dispatch offers. Click "Manual Assign" on laptop or use demo presets.
                </p>

                <div className="mt-4 w-full rounded-[8px] border border-[#131e5c] bg-[#00052e] p-3 text-left">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#34fcff]">
                    <Zap className="h-3 w-3" />
                    <span>INSTANT DEMO TRIGGER:</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-[#6b6b83]">
                    Switch to Admin Ops tab and assign order, or tap below to test simulator!
                  </p>
                  <button
                    onClick={startSimulation}
                    className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#0428cb]/40 border border-[#34fcff]/50 py-2 font-mono text-xs text-[#34fcff] hover:bg-[#0428cb]"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>TEST SIMULATED GPS STREAM</span>
                  </button>
                </div>
              </div>
            )}

            {/* STATE 2: Order Received */}
            {riderState === 2 && activeOrder && (
              <div className="flex flex-1 flex-col justify-between animate-fadeIn">
                <div className="rounded-[10px] border-2 border-[#34fcff] bg-[#00052e] p-3.5 shadow-cyan-glow">
                  <div className="flex items-center justify-between border-b border-[#131e5c] pb-2">
                    <span className="font-mono text-xs font-bold text-[#34fcff]">
                      DISPATCH OFFER
                    </span>
                    <span className="font-mono text-xs text-white">#{activeOrder.trackingCode}</span>
                  </div>

                  <div className="mt-2 text-sm font-bold text-white">{activeOrder.customerName}</div>
                  <div className="text-xs text-[#afb4db] truncate">{activeOrder.itemsDescription}</div>

                  <div className="mt-3 space-y-1.5 text-xs font-mono border-t border-[#131e5c] pt-2">
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#10b981] font-bold">A:</span>
                      <span className="text-white truncate">{activeOrder.pickupAddress}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#ef4444] font-bold">B:</span>
                      <span className="text-white truncate">{activeOrder.dropoffAddress}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAcceptOrder}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#0428cb] to-[#34fcff] py-3.5 text-sm font-bold text-white shadow-cyan-glow transition-transform active:scale-95"
                >
                  <CheckCircle2 className="h-5 w-5 text-white" />
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
                      <Truck className="h-4 w-4 text-[#34fcff]" />
                      <span className="font-mono text-xs font-bold text-white">MISSION ACTIVE</span>
                    </div>
                    <span className="rounded bg-[#10b981]/20 px-2 py-0.5 font-mono text-[10px] font-bold text-[#10b981]">
                      {activeOrder.status}
                    </span>
                  </div>

                  <div className="rounded-[8px] border border-[#131e5c] bg-[#00052e] p-3 font-mono text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#6b6b83]">PARCEL:</span>
                      <span className="text-white">#{activeOrder.trackingCode}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#131e5c] pt-1.5">
                      <span className="text-[#6b6b83]">DESTINATION:</span>
                      <span className="text-white truncate max-w-[150px]">{activeOrder.dropoffAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {activeOrder.status === 'ASSIGNED' ? (
                    <button
                      onClick={handlePickedUp}
                      className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#0428cb] py-3 text-xs font-bold text-white shadow-blue-glow hover:brightness-110 active:scale-95"
                    >
                      <MapPin className="h-4 w-4 text-[#34fcff]" />
                      <span>CONFIRM PARCEL PICKED UP</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleDelivered}
                      className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#10b981] py-3 text-xs font-bold text-white shadow-[0_0_15px_#10b981] hover:brightness-110 active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4 text-white" />
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
