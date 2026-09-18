'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { Order, fetchOrders, updateDriverLocationApi } from '@/lib/api';
import { MapboxMap } from '@/components/MapboxMap';
import { PhoneConnectModal } from '@/components/PhoneConnectModal';
import { useAuth } from '@/lib/auth';
import {
  Truck,
  CheckCircle2,
  Play,
  Square,
  Radio,
  MapPin,
  QrCode,
  Smartphone,
  Compass,
  Zap,
  Lock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Navigation,
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

/**
 * Calculates geographical distance between two coordinates in meters using the Haversine formula.
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates bearing/heading angle in degrees (0-360) from coordinate A to coordinate B.
 */
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

function getCompassDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}

export default function RiderCockpitPage() {
  const { user, login, logout } = useAuth();

  // Active Driver identification from Auth context
  const driverId = user?.driverId || 'driver_1';
  const driverName = user?.name || 'Captain Tariq Al-Mansoor';
  const isDriverAuthorized = user?.role === 'DRIVER';

  // Rider State Machine: 1 = WAITING, 2 = RECEIVED, 3 = IN_TRANSIT
  const [riderState, setRiderState] = useState<1 | 2 | 3>(1);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // GPS Telemetry State
  const [currentCoords, setCurrentCoords] = useState<{
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    accuracy: number;
  }>({
    lat: 25.3223,
    lng: 51.5298,
    heading: 45,
    speed: 0,
    accuracy: 4,
  });

  // GPS Mode: 'hardware' (Real device GPS) or 'sim' (Synthetic Corniche track)
  const [gpsMode, setGpsMode] = useState<'hardware' | 'sim'>('hardware');
  const [isSimulating, setIsSimulating] = useState(false);

  // Tracking references
  const prevPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const simStepRef = useRef(0);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastRestSyncRef = useRef<number>(0);

  // Telemetry emitter with dual transport (WebSockets + REST background sync)
  const emitLocationPing = useCallback(
    (lat: number, lng: number, heading: number, speed: number, accuracy: number) => {
      const socket = getSocket();
      const now = Date.now();
      const payload = {
        driverId,
        lat,
        lng,
        heading,
        speed,
        accuracy,
        orderId: activeOrder?.id || activeOrder?.trackingCode,
        timestamp: now,
      };

      // 1. High-frequency WebSocket transport
      socket.emit('ping_location', payload);

      // 2. Periodic REST sync (every 5 seconds) to ensure Redis persistence on mobile dropouts
      if (now - lastRestSyncRef.current > 5000) {
        lastRestSyncRef.current = now;
        updateDriverLocationApi(driverId, payload).catch(() => {});
      }
    },
    [driverId, activeOrder]
  );

  // Start Hardware GPS with high-precision mobile sensors
  const startHardwareGPS = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation sensor not supported on this browser/device.');
      return;
    }

    setGpsMode('hardware');
    setIsSimulating(false);
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setGpsError(null);

    // Clear existing watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const rawLat = position.coords.latitude;
        const rawLng = position.coords.longitude;
        const rawAccuracy = position.coords.accuracy || 5;
        const now = position.timestamp || Date.now();

        let calculatedHeading = position.coords.heading;
        let calculatedSpeed = position.coords.speed !== null ? position.coords.speed * 3.6 : 0;

        // If hardware heading/speed is null (common in Safari/Chrome when stationary), calculate mathematically
        if (prevPositionRef.current) {
          const distanceMeters = calculateDistanceMeters(
            prevPositionRef.current.lat,
            prevPositionRef.current.lng,
            rawLat,
            rawLng
          );
          const deltaSeconds = (now - prevPositionRef.current.timestamp) / 1000;

          if (distanceMeters > 1.5 && deltaSeconds > 0) {
            if (calculatedHeading === null || calculatedHeading === undefined || isNaN(calculatedHeading)) {
              calculatedHeading = calculateBearing(
                prevPositionRef.current.lat,
                prevPositionRef.current.lng,
                rawLat,
                rawLng
              );
            }
            if (position.coords.speed === null || position.coords.speed === undefined) {
              calculatedSpeed = (distanceMeters / deltaSeconds) * 3.6;
            }
          }
        }

        const heading = calculatedHeading ?? currentCoords.heading ?? 0;
        const speed = Math.max(0, calculatedSpeed);

        prevPositionRef.current = { lat: rawLat, lng: rawLng, timestamp: now };

        const newCoords = {
          lat: rawLat,
          lng: rawLng,
          heading: Math.round(heading),
          speed: Math.round(speed * 10) / 10,
          accuracy: Math.round(rawAccuracy),
        };

        setCurrentCoords(newCoords);
        emitLocationPing(newCoords.lat, newCoords.lng, newCoords.heading, newCoords.speed, newCoords.accuracy);
      },
      (error) => {
        console.warn('[RIDER] Geolocation error:', error.message);
        if (error.code === 1) {
          setGpsError('GPS permission denied. Enable location services in your device settings.');
        } else if (error.code === 2) {
          setGpsError('GPS position unavailable. Switching to Doha Corniche Simulator.');
        } else {
          setGpsError(`GPS Timeout (${error.message}).`);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );
  }, [emitLocationPing, currentCoords.heading]);

  const stopHardwareGPS = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Automated Route Simulator along Doha Corniche
  const startSimulation = useCallback(() => {
    setIsSimulating(true);
    setGpsMode('sim');
    setGpsError(null);
    stopHardwareGPS();

    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    simIntervalRef.current = setInterval(() => {
      simStepRef.current = (simStepRef.current + 1) % DOHA_SIMULATION_WAYPOINTS.length;
      const [lng, lat] = DOHA_SIMULATION_WAYPOINTS[simStepRef.current];

      const nextIdx = (simStepRef.current + 1) % DOHA_SIMULATION_WAYPOINTS.length;
      const [nextLng, nextLat] = DOHA_SIMULATION_WAYPOINTS[nextIdx];
      const heading = calculateBearing(lat, lng, nextLat, nextLng);

      const newCoords = {
        lat,
        lng,
        heading: Math.round(heading),
        speed: Math.round(44 + Math.random() * 8),
        accuracy: 3,
      };

      setCurrentCoords(newCoords);
      emitLocationPing(newCoords.lat, newCoords.lng, newCoords.heading, newCoords.speed, newCoords.accuracy);
    }, 2000);
  }, [emitLocationPing, stopHardwareGPS]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  }, []);

  // Initial order hydration & Socket listener setup
  useEffect(() => {
    if (!isDriverAuthorized) return;

    // Check for existing assigned order in database
    fetchOrders()
      .then((orders) => {
        const assigned = orders.find(
          (o) => o.driverId === driverId && (o.status === 'ASSIGNED' || o.status === 'IN_TRANSIT')
        );
        if (assigned) {
          setActiveOrder(assigned);
          setRiderState(3); // In Transit / Assigned
        }
      })
      .catch(() => {});

    const socket = getSocket();

    // Join isolated driver room
    socket.emit('join:driver', driverId);

    // Listen for incoming dispatch offer from dispatchers
    const handleOrderDispatch = (data: { order: Order; driverId: string }) => {
      if (data.driverId === driverId) {
        console.log('[RIDER] Received dispatch offer:', data.order);
        setActiveOrder(data.order);
        setRiderState(2); // State 2: Order Offer Received
      }
    };

    socket.on('order_dispatch', handleOrderDispatch);

    // Auto-start hardware GPS by default
    startHardwareGPS();

    return () => {
      socket.off('order_dispatch', handleOrderDispatch);
      stopSimulation();
      stopHardwareGPS();
    };
  }, [driverId, isDriverAuthorized, startHardwareGPS, stopSimulation, stopHardwareGPS]);

  // Handle Driver Order Actions
  const handleAcceptOrder = () => {
    if (!activeOrder) return;
    const socket = getSocket();
    socket.emit('status_change', {
      orderId: activeOrder.id,
      driverId,
      status: 'ASSIGNED',
    });
    setRiderState(3); // Enter State 3: In Transit
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
    setRiderState(1); // Back to State 1: Waiting
    setActiveOrder(null);
  };

  // RESTRICTED ACCESS GATE: If not logged in as a DRIVER
  if (!isDriverAuthorized) {
    return (
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center bg-md-surface px-4 py-12 text-md-on-surface">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-[28px] bg-md-surface-container p-8 shadow-sm border border-md-outline/15 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-4">
              <Lock className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-bold text-md-on-surface">Fleet Captain Terminal</h2>
            <p className="mt-2 text-xs text-md-on-surface-variant leading-relaxed">
              This terminal is strictly reserved for authenticated Zeego Delivery couriers with active hardware GPS telematics.
            </p>

            {user ? (
              <div className="mt-5 rounded-2xl bg-md-surface p-4 text-left border border-md-outline/10 text-xs">
                <div className="text-[11px] font-semibold text-md-on-surface-variant uppercase tracking-wider">
                  Current Session
                </div>
                <div className="mt-1 font-bold text-md-on-surface">{user.name}</div>
                <div className="text-[11px] font-mono text-md-primary">Role: {user.role}</div>
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              <button
                onClick={() => login('DRIVER')}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-md-primary py-3 text-xs font-semibold text-md-on-primary shadow-sm hover:bg-md-primary/90 transition-all active:scale-95"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Authenticate as Captain Tariq</span>
              </button>

              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-md-outline/20 bg-md-surface py-2.5 text-xs font-medium text-md-on-surface hover:bg-md-surface-low transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Switch Account / Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-md-surface px-4 py-8 sm:px-6 lg:px-8 text-md-on-surface transition-colors duration-300">
      <div className="mx-auto flex max-w-5xl flex-col lg:flex-row items-center justify-center gap-8">
        {/* Left Side: Desktop Companion Information */}
        <div className="hidden lg:flex w-80 flex-col space-y-4">
          <div className="rounded-[28px] border border-md-outline/15 bg-md-surface-container p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-md-primary">
              <Smartphone className="h-4 w-4" />
              <span>TEST ON MOBILE PHONE</span>
            </div>
            <p className="mt-2 text-xs text-md-on-surface-variant leading-relaxed">
              Scan this QR code to open the cockpit on your phone. Stream accurate hardware GPS coordinates directly into the live dispatch engine.
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
            <div className="text-md-on-surface font-bold flex items-center justify-between">
              <span>HARDWARE TELEMETRY</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex justify-between border-t border-md-outline/10 pt-2 font-mono">
              <span>CAPTAIN:</span>
              <span className="text-md-on-surface font-semibold">{driverName}</span>
            </div>
            <div className="flex justify-between border-t border-md-outline/10 pt-2 font-mono">
              <span>MODE:</span>
              <span className={gpsMode === 'hardware' ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                {gpsMode === 'hardware' ? 'DEVICE GPS (LIVE)' : 'SIM CORNICHE (2s)'}
              </span>
            </div>
            <div className="flex justify-between border-t border-md-outline/10 pt-2 font-mono">
              <span>ACCURACY:</span>
              <span className="text-md-on-surface">±{currentCoords.accuracy}m</span>
            </div>
            <div className="flex justify-between border-t border-md-outline/10 pt-2 font-mono">
              <span>COORDINATES:</span>
              <span className="text-md-on-surface">
                {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mobile Device PWA Cockpit */}
        <div className="relative w-full max-w-sm rounded-[36px] border-4 border-md-outline/20 bg-md-surface shadow-2xl overflow-hidden flex flex-col h-[760px]">
          {/* Mobile Top Status Notch */}
          <div className="flex items-center justify-between border-b border-md-outline/15 bg-md-surface-container px-5 py-3 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-md-on-surface text-[11px]">{driverName}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-md-primary font-semibold">
              <Navigation className="h-3 w-3" />
              <span>{gpsMode === 'hardware' ? 'GPS LOCKED' : 'SIMULATION'}</span>
            </div>
          </div>

          {/* GPS Error Notification Banner */}
          {gpsError ? (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{gpsError}</span>
              </div>
              <button
                onClick={startSimulation}
                className="ml-2 font-bold underline shrink-0 hover:text-amber-500"
              >
                Use Sim
              </button>
            </div>
          ) : null}

          {/* Map Section */}
          <div className="relative h-[340px] w-full border-b border-md-outline/15">
            <MapboxMap
              center={[currentCoords.lng, currentCoords.lat]}
              zoom={14}
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
              routeCoordinates={gpsMode === 'sim' ? DOHA_SIMULATION_WAYPOINTS : undefined}
              followDriver={true}
            />

            {/* Live Speedometer Overlay */}
            <div className="absolute top-3 left-3 rounded-2xl border border-md-outline/15 bg-md-surface-container/90 p-2.5 backdrop-blur-md shadow-md">
              <span className="font-mono text-[9px] text-md-on-surface-variant">SPEED</span>
              <div className="font-mono text-xl font-bold text-md-primary">
                {currentCoords.speed.toFixed(0)} <span className="text-[10px] text-md-on-surface">KM/H</span>
              </div>
              <div className="mt-0.5 font-mono text-[9px] text-md-on-surface-variant flex items-center gap-1">
                <Compass className="h-2.5 w-2.5" />
                <span>
                  {currentCoords.heading}° {getCompassDirection(currentCoords.heading)}
                </span>
              </div>
            </div>

            {/* GPS Accuracy / Mode Toggle Controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
              <button
                onClick={gpsMode === 'hardware' ? startSimulation : startHardwareGPS}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold shadow-md transition-all active:scale-95 ${
                  gpsMode === 'hardware'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-md-primary text-md-on-primary hover:bg-md-primary/90'
                }`}
              >
                {gpsMode === 'hardware' ? (
                  <>
                    <Navigation className="h-3 w-3" />
                    <span>DEVICE GPS</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" />
                    <span>SIMULATOR</span>
                  </>
                )}
              </button>

              <button
                onClick={gpsMode === 'hardware' ? startSimulation : startHardwareGPS}
                className="flex items-center gap-1 rounded-full border border-md-outline/25 bg-md-surface/90 px-2.5 py-1 font-mono text-[9px] text-md-on-surface hover:bg-md-surface-low backdrop-blur-sm"
              >
                <RefreshCw className="h-2.5 w-2.5 text-md-primary" />
                <span>{gpsMode === 'hardware' ? 'SWITCH TO SIM' : 'USE DEVICE GPS'}</span>
              </button>
            </div>

            {/* Coordinates Badge */}
            <div className="absolute bottom-2 left-3 rounded-full bg-black/60 px-2.5 py-0.5 backdrop-blur-md text-[9px] font-mono text-white/90">
              ±{currentCoords.accuracy}m · {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
            </div>
          </div>

          {/* Bottom Cockpit Controls */}
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

                <h3 className="text-base font-bold text-md-on-surface">Available for Dispatch</h3>
                <p className="mt-1 text-xs text-md-on-surface-variant max-w-[240px] leading-relaxed">
                  Real-time GPS telemetry is active. Standing by for courier assignments from Doha Operations HQ.
                </p>

                <div className="mt-4 w-full rounded-2xl border border-md-outline/15 bg-md-surface p-3.5 text-left shadow-sm">
                  <div className="flex items-center justify-between font-mono text-[10px] text-md-primary font-bold">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      <span>TELEMETRY STREAM:</span>
                    </div>
                    <span className="text-emerald-500 font-bold">ACTIVE</span>
                  </div>
                  <p className="mt-1 text-[11px] text-md-on-surface-variant">
                    {gpsMode === 'hardware'
                      ? 'Streaming hardware location from your device. Walk or drive to observe live speed and heading.'
                      : 'Simulating movement along Doha Corniche at 48 km/h.'}
                  </p>
                  <button
                    onClick={gpsMode === 'hardware' ? startSimulation : startHardwareGPS}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-md-secondary-container hover:bg-md-secondary-container/80 text-md-on-secondary-container py-2 text-xs font-medium active:scale-95 transition-all shadow-sm"
                  >
                    {gpsMode === 'hardware' ? (
                      <>
                        <Play className="h-3.5 w-3.5 text-md-primary" />
                        <span>TEST WITH CORNICHE SIMULATOR</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="h-3.5 w-3.5 text-md-primary" />
                        <span>ACTIVATE REAL DEVICE GPS</span>
                      </>
                    )}
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
                      <span className="text-md-on-surface truncate max-w-[150px] font-semibold">
                        {activeOrder.dropoffAddress}
                      </span>
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
