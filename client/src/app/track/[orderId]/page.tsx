'use client';

import React, { useEffect, useState, use } from 'react';
import { getSocket } from '@/lib/socket';
import { fetchOrderById, Order } from '@/lib/api';
import { MapboxMap } from '@/components/MapboxMap';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Phone,
  Radio,
  Share2,
  Copy,
  Check,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface TrackingPageProps {
  params: Promise<{ orderId: string }>;
}

export default function CustomerTrackingPage({ params }: TrackingPageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Real-time Driver GPS from Socket.io room
  const [driverCoords, setDriverCoords] = useState<{
    lat: number;
    lng: number;
    heading: number;
    speed?: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      try {
        const data = await fetchOrderById(orderId);
        if (isMounted) {
          setOrder(data);
          if (data.driverLiveLocation) {
            setDriverCoords({
              lat: data.driverLiveLocation.lat,
              lng: data.driverLiveLocation.lng,
              heading: data.driverLiveLocation.heading || 0,
              speed: data.driverLiveLocation.speed || 0,
            });
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Order not found');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrder();

    const socket = getSocket();

    // Join specific order room
    socket.emit('join:order', orderId);

    const handleLocationUpdate = (telemetry: any) => {
      setDriverCoords({
        lat: telemetry.lat,
        lng: telemetry.lng,
        heading: telemetry.heading || 0,
        speed: telemetry.speed || 0,
      });
    };

    const handleStatusUpdate = (updatedOrder: Order) => {
      if (updatedOrder.id === orderId || updatedOrder.trackingCode === orderId) {
        setOrder((prev) => (prev ? { ...prev, ...updatedOrder } : updatedOrder));
      }
    };

    socket.on('location_update', handleLocationUpdate);
    socket.on('order_status_updated', handleStatusUpdate);

    return () => {
      isMounted = false;
      socket.off('location_update', handleLocationUpdate);
      socket.off('order_status_updated', handleStatusUpdate);
    };
  }, [orderId]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-md-surface text-md-on-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-md-primary border-t-transparent" />
          <span className="font-mono text-xs tracking-widest text-md-on-surface-var">
            ESTABLISHING ENCRYPTED TELEMETRY LINK...
          </span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-md-surface px-4 text-md-on-surface">
        <div className="max-w-md rounded-[28px] bg-md-surface-container p-8 text-center shadow-md border border-md-outline/15">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-xl font-bold text-md-on-surface">Order Lookup Unsuccessful</h2>
          <p className="mt-2 text-sm text-md-on-surface-var">
            Tracking identifier #{orderId} could not be resolved in the Doha dispatch registry.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-md-primary px-6 py-2.5 text-sm font-medium text-md-on-primary hover:bg-md-primary/90 active:scale-95 shadow-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            RETURN TO COMMAND HUB
          </Link>
        </div>
      </div>
    );
  }

  const getStage = (status: string) => {
    if (status === 'DELIVERED') return 3;
    if (status === 'IN_TRANSIT') return 2;
    return 1;
  };

  const currentStage = getStage(order.status);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-md-surface px-4 py-8 sm:px-6 lg:px-8 text-md-on-surface overflow-hidden">
      {/* Decorative Material You Blur Shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-100px] right-[-100px] h-[380px] w-[380px] rounded-full bg-md-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-100px] left-[-100px] h-[340px] w-[340px] rounded-full bg-md-secondary-container/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Top Header & Quick Actions */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-md-outline/15 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-md-on-surface-var">
                ZEEGO LAST-MILE PARCEL
              </span>
              <span className="rounded-full bg-md-secondary-container px-3 py-0.5 font-mono text-xs font-bold text-md-on-secondary-container">
                #{order.trackingCode}
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-md-on-surface sm:text-3xl">
              {order.status === 'DELIVERED'
                ? 'Package Delivered Successfully'
                : order.status === 'IN_TRANSIT'
                ? 'Captain Is En Route to Destination'
                : 'Order Confirmed · Preparing for Dispatch'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-full bg-md-surface-container px-4 py-2 text-xs font-medium text-md-on-surface hover:bg-md-surface-variant/30 active:scale-95 shadow-sm transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-md-primary" />}
              <span>{copied ? 'Link Copied' : 'Share Tracking'}</span>
            </button>

            <div className="flex items-center gap-2 rounded-full bg-md-secondary-container px-4 py-2 text-xs font-medium text-md-on-secondary-container">
              <Radio className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              <span>LIVE TELEMETRY</span>
            </div>
          </div>
        </div>

        {/* 3-Step Progress Stage Indicator */}
        <div className="mb-8 rounded-[28px] bg-md-surface-container p-6 sm:p-8 shadow-sm border border-md-outline/10">
          <div className="relative flex items-center justify-between">
            {/* Horizontal progress bar track */}
            <div className="absolute top-1/2 left-8 right-8 h-1.5 -translate-y-1/2 bg-md-surface-low rounded-full overflow-hidden">
              <div
                className="h-full bg-md-primary transition-all duration-700 rounded-full"
                style={{
                  width: currentStage === 1 ? '15%' : currentStage === 2 ? '55%' : '100%',
                }}
              />
            </div>

            {/* Step 1: Preparing */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-sm ${
                  currentStage >= 1
                    ? 'bg-md-primary text-md-on-primary ring-4 ring-md-secondary-container'
                    : 'bg-md-surface text-md-on-surface-var border border-md-outline/30'
                }`}
              >
                <Package className="h-5 w-5" />
              </div>
              <span className="mt-2.5 text-xs font-bold text-md-on-surface">Preparing</span>
              <span className="text-[11px] text-md-on-surface-var truncate max-w-[120px] text-center">
                {order.pickupAddress.slice(0, 18)}
              </span>
            </div>

            {/* Step 2: En Route */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-sm ${
                  currentStage >= 2
                    ? 'bg-md-primary text-md-on-primary ring-4 ring-md-secondary-container'
                    : 'bg-md-surface text-md-on-surface-var border border-md-outline/30'
                }`}
              >
                <Truck className="h-5 w-5" />
              </div>
              <span className="mt-2.5 text-xs font-bold text-md-on-surface">En Route</span>
              <span className="text-[11px] font-mono font-medium text-md-primary">
                {driverCoords?.speed ? `${driverCoords.speed.toFixed(0)} km/h live` : 'Dispatched'}
              </span>
            </div>

            {/* Step 3: Delivered */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-sm ${
                  currentStage === 3
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950'
                    : 'bg-md-surface text-md-on-surface-var border border-md-outline/30'
                }`}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="mt-2.5 text-xs font-bold text-md-on-surface">Delivered</span>
              <span className="text-[11px] text-md-on-surface-var truncate max-w-[120px] text-center">
                {order.dropoffAddress.slice(0, 18)}
              </span>
            </div>
          </div>
        </div>

        {/* Live Delivery Map & Courier Information */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Map Viewport */}
          <div className="relative h-[480px] rounded-[28px] overflow-hidden lg:col-span-2 shadow-md border border-md-outline/15 bg-md-surface-container">
            <MapboxMap
              center={[51.5310, 25.3280]}
              zoom={13}
              pitch={35}
              bearing={15}
              driverCoords={driverCoords}
              pickupCoords={{
                lat: order.pickupLat,
                lng: order.pickupLng,
                label: order.pickupAddress,
              }}
              dropoffCoords={{
                lat: order.dropoffLat,
                lng: order.dropoffLng,
                label: order.dropoffAddress,
              }}
              followDriver={currentStage === 2}
            />

            {/* In-Map Telemetry Pill */}
            {driverCoords && (
              <div className="absolute bottom-4 left-4 z-10 rounded-full bg-md-surface/90 px-4 py-2 backdrop-blur-md shadow-md border border-md-outline/15 text-xs text-md-on-surface">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-bold text-md-primary">LIVE GPS:</span>
                  <span className="font-mono text-md-on-surface">
                    {driverCoords.lat.toFixed(4)}, {driverCoords.lng.toFixed(4)} · {(driverCoords.speed || 0).toFixed(0)} km/h
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Information Cards */}
          <div className="flex flex-col gap-4">
            {/* Courier Profile Card */}
            <div className="rounded-[24px] bg-md-surface-container p-6 shadow-sm border border-md-outline/15">
              <div className="flex items-center justify-between border-b border-md-outline/10 pb-3">
                <span className="font-mono text-xs uppercase tracking-wider text-md-on-surface-var">
                  ASSIGNED COURIER
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-md-primary text-md-on-primary font-bold text-sm shadow-sm">
                  TA
                </div>
                <div>
                  <div className="text-base font-bold text-md-on-surface">
                    {order.driver?.name || 'Captain Tariq Al-Mansoor'}
                  </div>
                  <div className="text-xs text-md-on-surface-var">
                    {order.driver?.vehicle || 'Yamaha MT-07 Unit · 4.95 ★'}
                  </div>
                </div>
              </div>

              <a
                href="tel:+97455001234"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-md-primary py-2.5 text-xs font-bold text-md-on-primary hover:bg-md-primary/90 active:scale-95 shadow-sm transition-all"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>CALL CAPTAIN (+974 5500 1234)</span>
              </a>
            </div>

            {/* Delivery Destination Details */}
            <div className="flex-1 rounded-[24px] bg-md-surface-container p-6 shadow-sm border border-md-outline/15 space-y-4 text-xs">
              <div className="font-bold text-md-on-surface border-b border-md-outline/10 pb-2 text-sm">
                DELIVERY SUMMARY
              </div>

              <div>
                <span className="text-md-on-surface-var font-mono text-[11px]">RECIPIENT:</span>
                <div className="text-md-on-surface font-semibold mt-0.5">{order.customerName} ({order.customerPhone})</div>
              </div>

              <div className="border-t border-md-outline/10 pt-2.5">
                <span className="text-md-on-surface-var font-mono text-[11px]">PARCEL CONTENTS:</span>
                <div className="text-md-on-surface mt-0.5">{order.itemsDescription}</div>
              </div>

              <div className="border-t border-md-outline/10 pt-2.5">
                <span className="text-md-on-surface-var font-mono text-[11px]">DROPOFF ADDRESS:</span>
                <div className="text-md-on-surface font-medium mt-0.5">{order.dropoffAddress}</div>
              </div>

              <div className="border-t border-md-outline/10 pt-2.5">
                <span className="text-md-on-surface-var font-mono text-[11px]">QATAR CARRIER STATUS:</span>
                <div className="text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Ooredoo 5G Telemetry Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
