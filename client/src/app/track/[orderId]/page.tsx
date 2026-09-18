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
} from 'lucide-react';

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
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#00052e] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#34fcff] border-t-transparent shadow-cyan-glow" />
          <span className="font-mono text-xs tracking-widest text-[#afb4db]">
            ESTABLISHING ENCRYPTED TELEMETRY LINK...
          </span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#00052e] px-4 text-white">
        <div className="max-w-md rounded-[12px] border border-[#131e5c] bg-[#02093a] p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-12 w-12 text-[#ef4444]" />
          <h2 className="mt-4 text-xl font-bold text-white">Order Lookup Unsuccessful</h2>
          <p className="mt-2 font-mono text-xs text-[#8185a0]">
            Tracking identifier #{orderId} could not be resolved in the Doha registry.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-[8px] bg-[#0428cb] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0428cb]/80 shadow-blue-glow"
          >
            RETURN TO COMMAND HUB
          </a>
        </div>
      </div>
    );
  }

  // Stage calculation:
  // Stage 1: PENDING / ASSIGNED (Preparing)
  // Stage 2: IN_TRANSIT (En Route)
  // Stage 3: DELIVERED (Delivered)
  const getStage = (status: string) => {
    if (status === 'DELIVERED') return 3;
    if (status === 'IN_TRANSIT') return 2;
    return 1;
  };

  const currentStage = getStage(order.status);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#00052e] px-4 py-8 sm:px-6 lg:px-8 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Top Header & Quick Actions */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#131e5c] pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-[#8185a0]">ZEEGO LAST-MILE PARCEL</span>
              <span className="rounded-[4px] border border-[#34fcff]/40 bg-[#0428cb]/30 px-2.5 py-0.5 font-mono text-xs font-bold text-[#34fcff] shadow-cyan-glow">
                #{order.trackingCode}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
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
              className="flex items-center gap-1.5 rounded-[8px] border border-[#131e5c] bg-[#02093a] px-3 py-1.5 font-mono text-xs text-[#afb4db] hover:text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#10b981]" /> : <Share2 className="h-3.5 w-3.5 text-[#34fcff]" />}
              <span>{copied ? 'Link Copied' : 'Share Tracking'}</span>
            </button>

            <div className="flex items-center gap-2 rounded-full border border-[#131e5c] bg-[#02093a] px-3.5 py-1.5 text-xs font-mono">
              <Radio className="h-3.5 w-3.5 text-[#10b981] animate-pulse" />
              <span className="text-[#34fcff]">LIVE TELEMETRY</span>
            </div>
          </div>
        </div>

        {/* 3-Step Progress Stage Indicator */}
        <div className="mb-8 rounded-[12px] border border-[#131e5c] bg-[#02093a]/80 p-6 backdrop-blur-xl shadow-2xl shadow-[#0428cb]/20">
          <div className="relative flex items-center justify-between">
            {/* Horizontal progress bar track */}
            <div className="absolute top-1/2 left-8 right-8 h-1 -translate-y-1/2 bg-[#00052e] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0428cb] via-[#34fcff] to-[#10b981] transition-all duration-700 shadow-cyan-glow"
                style={{
                  width: currentStage === 1 ? '15%' : currentStage === 2 ? '55%' : '100%',
                }}
              />
            </div>

            {/* Step 1: Preparing */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                  currentStage >= 1
                    ? 'border-[#34fcff] bg-[#0428cb] shadow-cyan-glow text-white'
                    : 'border-[#131e5c] bg-[#00052e] text-[#6b6b83]'
                }`}
              >
                <Package className="h-5 w-5" />
              </div>
              <span className="mt-2.5 font-mono text-xs font-bold text-white">Preparing</span>
              <span className="text-[11px] text-[#8185a0]">{order.pickupAddress.slice(0, 18)}</span>
            </div>

            {/* Step 2: En Route */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                  currentStage >= 2
                    ? 'border-[#34fcff] bg-[#0428cb] shadow-cyan-glow text-white'
                    : 'border-[#131e5c] bg-[#00052e] text-[#6b6b83]'
                }`}
              >
                <Truck className="h-5 w-5" />
              </div>
              <span className="mt-2.5 font-mono text-xs font-bold text-white">En Route</span>
              <span className="text-[11px] font-mono text-[#34fcff]">
                {driverCoords?.speed ? `${driverCoords.speed.toFixed(0)} km/h live` : 'Dispatched'}
              </span>
            </div>

            {/* Step 3: Delivered */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                  currentStage === 3
                    ? 'border-[#10b981] bg-[#10b981] shadow-[0_0_16px_#10b981] text-white'
                    : 'border-[#131e5c] bg-[#00052e] text-[#6b6b83]'
                }`}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="mt-2.5 font-mono text-xs font-bold text-white">Delivered</span>
              <span className="text-[11px] text-[#8185a0]">{order.dropoffAddress.slice(0, 18)}</span>
            </div>
          </div>
        </div>

        {/* Live Delivery Map & Courier Information */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Map Viewport */}
          <div className="relative h-[480px] rounded-[12px] border border-[#131e5c] overflow-hidden lg:col-span-2 shadow-2xl">
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

            {/* In-Map Telemetry Toast */}
            {driverCoords && (
              <div className="absolute bottom-4 left-4 z-10 rounded-[8px] border border-[#34fcff]/40 bg-[#00052e]/95 px-3.5 py-2 backdrop-blur-xl font-mono text-xs shadow-cyan-glow">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#34fcff] animate-ping" />
                  <span className="text-[#34fcff] font-bold">LIVE TELEMETRY:</span>
                  <span className="text-white">
                    {driverCoords.lat.toFixed(4)}, {driverCoords.lng.toFixed(4)} · {(driverCoords.speed || 0).toFixed(0)} km/h
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Information Cards */}
          <div className="flex flex-col gap-4">
            {/* Courier Profile Card */}
            <div className="rounded-[12px] border border-[#131e5c] bg-[#02093a]/80 p-5 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-between border-b border-[#131e5c] pb-3">
                <span className="font-mono text-xs uppercase tracking-widest text-[#8185a0]">
                  ASSIGNED COURIER
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#10b981]">
                  <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0428cb] to-[#34fcff] text-white font-bold text-sm shadow-cyan-glow">
                  TA
                </div>
                <div>
                  <div className="text-base font-bold text-white">
                    {order.driver?.name || 'Captain Tariq Al-Mansoor'}
                  </div>
                  <div className="font-mono text-xs text-[#8185a0]">
                    {order.driver?.vehicle || 'Yamaha MT-07 Unit · 4.95 ★'}
                  </div>
                </div>
              </div>

              <a
                href="tel:+97455001234"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#0428cb] py-2.5 font-mono text-xs font-bold text-white shadow-blue-glow hover:bg-[#0428cb]/80 transition-all"
              >
                <Phone className="h-3.5 w-3.5 text-[#34fcff]" />
                <span>CALL CAPTAIN (+974 5500 1234)</span>
              </a>
            </div>

            {/* Delivery Destination Details */}
            <div className="flex-1 rounded-[12px] border border-[#131e5c] bg-[#02093a]/80 p-5 backdrop-blur-xl shadow-lg space-y-4 font-mono text-xs">
              <div className="font-bold text-white border-b border-[#131e5c] pb-2 font-sans text-sm">
                DELIVERY SUMMARY
              </div>

              <div>
                <span className="text-[#6b6b83]">RECIPIENT:</span>
                <div className="text-white font-medium">{order.customerName} ({order.customerPhone})</div>
              </div>

              <div className="border-t border-[#131e5c] pt-2">
                <span className="text-[#6b6b83]">PARCEL CONTENTS:</span>
                <div className="text-[#afb4db]">{order.itemsDescription}</div>
              </div>

              <div className="border-t border-[#131e5c] pt-2">
                <span className="text-[#6b6b83]">DROPOFF ADDRESS:</span>
                <div className="text-white">{order.dropoffAddress}</div>
              </div>

              <div className="border-t border-[#131e5c] pt-2">
                <span className="text-[#6b6b83]">QATAR CARRIER STATUS:</span>
                <div className="text-[#10b981]">Ooredoo 5G Telemetry Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
