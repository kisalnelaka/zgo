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
  ArrowRight,
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

    // Listen for live driver location updates in this order room
    const handleLocationUpdate = (telemetry: any) => {
      setDriverCoords({
        lat: telemetry.lat,
        lng: telemetry.lng,
        heading: telemetry.heading || 0,
        speed: telemetry.speed || 0,
      });
    };

    // Listen for order status transitions
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

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#00052e] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#34fcff] border-t-transparent" />
          <span className="font-mono text-xs tracking-wider text-[#8185a0]">
            CONNECTING TO ZEEGO TELEMETRY ENGINE...
          </span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#00052e] px-4 text-white">
        <div className="max-w-md rounded-[8px] border border-[#131e5c] bg-[#02093a] p-6 text-center">
          <Package className="mx-auto h-10 w-10 text-[#ef4444]" />
          <h2 className="mt-3 text-lg font-semibold text-white">Order Lookup Failed</h2>
          <p className="mt-1 font-mono text-xs text-[#8185a0]">{error || 'Order code does not exist.'}</p>
          <a
            href="/"
            className="mt-5 inline-block rounded-[8px] bg-[#0428cb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0428cb]/80"
          >
            Return to Command Hub
          </a>
        </div>
      </div>
    );
  }

  // Stage indicator calculation
  // Stage 1: PENDING / ASSIGNED (Preparing)
  // Stage 2: IN_TRANSIT (En Route)
  // Stage 3: DELIVERED (Delivered)
  const getStage = (status: string) => {
    if (status === 'DELIVERED') return 3;
    if (status === 'IN_TRANSIT') return 2;
    return 1; // PENDING or ASSIGNED
  };

  const currentStage = getStage(order.status);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#00052e] px-4 py-8 sm:px-6 lg:px-8 text-white">
      <div className="mx-auto max-w-5xl">
        {/* Header with Tracking Badge */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#131e5c] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#6b6b83]">ZEEGO EXPRESS PARCEL</span>
              <span className="rounded-[4px] bg-[#0428cb]/20 px-2 py-0.5 font-mono text-xs font-semibold text-[#34fcff]">
                #{order.trackingCode}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-light tracking-tight text-white sm:text-3xl">
              {order.status === 'DELIVERED'
                ? 'Package Successfully Delivered'
                : order.status === 'IN_TRANSIT'
                ? 'Captain Is En Route to Your Location'
                : 'Order Confirmed & Preparing for Dispatch'}
            </h1>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#131e5c] bg-[#02093a] px-3 py-1 text-xs font-mono">
            <Radio className="h-3.5 w-3.5 text-[#10b981] animate-pulse" />
            <span className="text-[#afb4db]">LIVE TRACKING ROOM</span>
          </div>
        </div>

        {/* 3-Step Progress Bar: Preparing -> En Route -> Delivered */}
        <div className="mb-8 rounded-[8px] border border-[#131e5c] bg-[#02093a]/80 p-6 backdrop-blur-md">
          <div className="relative flex items-center justify-between">
            {/* Horizontal progress bar line */}
            <div className="absolute top-1/2 left-6 right-6 h-0.5 -translate-y-1/2 bg-[#131e5c]">
              <div
                className="h-full bg-gradient-to-r from-[#0428cb] to-[#34fcff] transition-all duration-700"
                style={{
                  width: currentStage === 1 ? '10%' : currentStage === 2 ? '55%' : '100%',
                }}
              />
            </div>

            {/* Step 1: Preparing */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  currentStage >= 1
                    ? 'border-[#34fcff] bg-[#0428cb] shadow-cyan-glow text-white'
                    : 'border-[#131e5c] bg-[#00052e] text-[#6b6b83]'
                }`}
              >
                <Package className="h-4 w-4" />
              </div>
              <span className="mt-2 font-mono text-xs font-semibold text-white">Preparing</span>
              <span className="text-[10px] text-[#6b6b83]">Souq Waqif Hub</span>
            </div>

            {/* Step 2: En Route */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  currentStage >= 2
                    ? 'border-[#34fcff] bg-[#0428cb] shadow-cyan-glow text-white'
                    : 'border-[#131e5c] bg-[#00052e] text-[#6b6b83]'
                }`}
              >
                <Truck className="h-4 w-4" />
              </div>
              <span className="mt-2 font-mono text-xs font-semibold text-white">En Route</span>
              <span className="text-[10px] text-[#6b6b83]">
                {driverCoords?.speed ? `${driverCoords.speed.toFixed(0)} km/h live` : 'Dispatched'}
              </span>
            </div>

            {/* Step 3: Delivered */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  currentStage === 3
                    ? 'border-[#10b981] bg-[#10b981] shadow-[0_0_12px_#10b981] text-white'
                    : 'border-[#131e5c] bg-[#00052e] text-[#6b6b83]'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="mt-2 font-mono text-xs font-semibold text-white">Delivered</span>
              <span className="text-[10px] text-[#6b6b83]">Porto Arabia</span>
            </div>
          </div>
        </div>

        {/* Live Delivery Map (When In Transit or Assigned) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Map Section */}
          <div className="relative h-[420px] rounded-[8px] border border-[#131e5c] overflow-hidden lg:col-span-2">
            <MapboxMap
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
            />

            {/* In-Map Telemetry Toast */}
            {driverCoords && (
              <div className="absolute bottom-3 left-3 rounded-[6px] border border-[#131e5c] bg-[#00052e]/90 px-3 py-1.5 backdrop-blur-md font-mono text-[10px]">
                <span className="text-[#34fcff]">LIVE TELEMETRY: </span>
                <span className="text-white">
                  {driverCoords.lat.toFixed(4)}, {driverCoords.lng.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {/* Delivery & Courier Detail Card (Ameba Frosted Surface) */}
          <div className="space-y-4">
            {/* Courier Info */}
            <div className="rounded-[8px] border border-[#131e5c] bg-[#02093a]/80 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-[#131e5c] pb-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#6b6b83]">
                  ASSIGNED COURIER
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#10b981]">
                  <ShieldCheck className="h-3 w-3" /> VERIFIED
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0428cb] border border-[#34fcff] text-white font-semibold">
                  TA
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {order.driver?.name || 'Captain Tariq Al-Mansoor'}
                  </div>
                  <div className="font-mono text-xs text-[#8185a0]">
                    {order.driver?.vehicle || 'Yamaha MT-07 Delivery Unit'}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-[6px] bg-[#00052e] p-2.5 font-mono text-xs">
                <span className="text-[#6b6b83]">Contact Captain:</span>
                <span className="text-[#34fcff] font-semibold">+974 5500 1234</span>
              </div>
            </div>

            {/* Delivery Destination Details */}
            <div className="rounded-[8px] border border-[#131e5c] bg-[#02093a]/80 p-5 backdrop-blur-md">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#6b6b83]">
                DELIVERY DETAILS
              </span>

              <div className="mt-3 space-y-3 font-mono text-xs">
                <div>
                  <div className="text-[#6b6b83]">CUSTOMER:</div>
                  <div className="text-white font-medium">{order.customerName}</div>
                </div>

                <div className="border-t border-[#131e5c] pt-2">
                  <div className="text-[#6b6b83]">PARCEL CONTENTS:</div>
                  <div className="text-[#afb4db]">{order.itemsDescription}</div>
                </div>

                <div className="border-t border-[#131e5c] pt-2">
                  <div className="text-[#6b6b83]">DROPOFF ADDRESS:</div>
                  <div className="text-white">{order.dropoffAddress}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
