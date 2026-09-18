'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Truck,
  Navigation as NavIcon,
  Zap,
  CheckCircle2,
  ArrowRight,
  Activity,
  Database,
  Server,
  Smartphone,
  QrCode,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { createOrder } from '@/lib/api';
import { PhoneConnectModal } from '@/components/PhoneConnectModal';

export default function CommandHubPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const handleInstantDispatch = async (destinationPreset: 'pearl' | 'lusail' | 'katara') => {
    setIsCreating(true);
    setCreatedOrderCode(null);

    const presets = {
      pearl: {
        pickupAddress: 'Souq Waqif Heritage Hub, Doha',
        pickupLat: 25.2867,
        pickupLng: 51.5333,
        dropoffAddress: 'Tower 22, Porto Arabia, The Pearl-Qatar',
        dropoffLat: 25.3713,
        dropoffLng: 51.5478,
        customerName: 'Fatima Al-Kuwari',
        customerPhone: '+974 6600 5678',
        itemsDescription: 'Artisan Confectionery & Gourmet Hamper',
      },
      lusail: {
        pickupAddress: 'City Center Financial District, West Bay',
        pickupLat: 25.3255,
        pickupLng: 51.5322,
        dropoffAddress: 'Marina Promenade Tower, Lusail City',
        dropoffLat: 25.4190,
        dropoffLng: 51.5262,
        customerName: 'Sheikh Nasser Al-Thani',
        customerPhone: '+974 7711 9900',
        itemsDescription: 'Express Corporate Hardware Pack',
      },
      katara: {
        pickupAddress: 'Villaggio Mall Logistics Bay, Al Waab',
        pickupLat: 25.2600,
        pickupLng: 51.4420,
        dropoffAddress: 'Katara Cultural Village Amphitheater Gate',
        dropoffLat: 25.3570,
        dropoffLng: 51.5240,
        customerName: 'Amina Al-Sulaiti',
        customerPhone: '+974 5599 3322',
        itemsDescription: 'VIP Event Passes & Presentation Kit',
      },
    };

    try {
      const newOrder = await createOrder(presets[destinationPreset]);
      setCreatedOrderCode(newOrder.trackingCode);
    } catch (err) {
      console.error('Failed to create demo order:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#00052e] px-4 py-12 sm:px-6 lg:px-8 text-white selection:bg-[#0428cb]">
      {/* Background Radial Glow Wash */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[700px] w-[700px] rounded-full bg-gradient-to-br from-[#06105a] to-transparent opacity-70 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Eyebrow and Editorial Display Headline */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-[6px] border border-[#34fcff]/40 bg-[#0428cb]/20 px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-[#34fcff] shadow-cyan-glow">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>ZEEGO LAST-MILE LOGISTICS · QATAR MISSION CONTROL</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-light tracking-[-0.03em] text-white sm:text-6xl sm:leading-[1.12]">
            Real-Time Last-Mile <br />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#34fcff] to-[#0428cb]">
              Dispatch Engine
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#afb4db] sm:text-base">
            High-frequency GPS telemetry streaming over Redis and WebSockets, syncing couriers,
            dispatch operators, and customers across Doha with zero page reloads.
          </p>

          {/* Quick Connect Mobile Callout */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowPhoneModal(true)}
              className="flex items-center gap-2 rounded-[8px] bg-gradient-to-r from-[#0428cb] to-[#34fcff] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-cyan-glow transition-transform hover:scale-105"
            >
              <Smartphone className="h-4 w-4" />
              <span>TEST ON PHONE VIA QR CODE</span>
            </button>

            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-[8px] border border-[#131e5c] bg-[#02093a] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#afb4db] hover:border-[#34fcff] hover:text-white"
            >
              <Compass className="h-4 w-4 text-[#34fcff]" />
              <span>OPEN ADMIN OPS</span>
            </Link>
          </div>
        </div>

        {/* 3 Core Interactive Portals */}
        <div className="mb-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1: Admin Operations */}
          <Link
            href="/admin"
            className="group relative flex flex-col justify-between rounded-[12px] border border-[#131e5c] bg-[#02093a]/80 p-6 backdrop-blur-xl transition-all hover:border-[#34fcff] hover:shadow-cyan-glow hover:-translate-y-1"
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#0428cb]/20 text-[#34fcff] border border-[#0428cb] shadow-cyan-glow">
                  <Compass className="h-6 w-6" />
                </div>
                <span className="font-mono text-[11px] tracking-wider text-[#6b6b83]">PORTAL 01</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#34fcff] transition-colors">
                Admin Command
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#afb4db]">
                Fullscreen Mapbox map rendering live driver positions via WebSocket rooms. Unassigned order queue with one-click manual dispatch.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#34fcff]">
              <span>LAUNCH OPERATIONS CENTER</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
            </div>
          </Link>

          {/* Card 2: Rider Mobile Cockpit */}
          <Link
            href="/rider"
            className="group relative flex flex-col justify-between rounded-[12px] border border-[#131e5c] bg-[#02093a]/80 p-6 backdrop-blur-xl transition-all hover:border-[#34fcff] hover:shadow-cyan-glow hover:-translate-y-1"
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#0428cb]/20 text-[#34fcff] border border-[#0428cb] shadow-cyan-glow">
                  <Truck className="h-6 w-6" />
                </div>
                <span className="font-mono text-[11px] tracking-wider text-[#6b6b83]">PORTAL 02</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#34fcff] transition-colors">
                Rider Cockpit (PWA)
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#afb4db]">
                Mobile-first driver terminal. Real-time GPS stream with an interactive Doha Route Simulator to test live motion on your phone or laptop.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#34fcff]">
              <span>OPEN RIDER TERMINAL</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
            </div>
          </Link>

          {/* Card 3: Customer Tracking */}
          <Link
            href="/track/ZG-QTR-9021"
            className="group relative flex flex-col justify-between rounded-[12px] border border-[#131e5c] bg-[#02093a]/80 p-6 backdrop-blur-xl transition-all hover:border-[#34fcff] hover:shadow-cyan-glow hover:-translate-y-1"
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#0428cb]/20 text-[#34fcff] border border-[#0428cb] shadow-cyan-glow">
                  <NavIcon className="h-6 w-6" />
                </div>
                <span className="font-mono text-[11px] tracking-wider text-[#6b6b83]">PORTAL 03</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#34fcff] transition-colors">
                Customer Tracking
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#afb4db]">
                Public tracking link with live delivery progress stage bar, dynamic driver vehicle trajectory, and simulated Qatar SMS alerts.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#34fcff]">
              <span>INSPECT TRACKING VIEW</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
            </div>
          </Link>
        </div>

        {/* Quick Dispatch Demo Launcher */}
        <div className="mb-14 rounded-[12px] border border-[#131e5c] bg-[#02093a]/80 p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#131e5c] pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#34fcff]" />
                <span>Instant Order Ingestion &amp; Dispatch Simulator</span>
              </h2>
              <p className="font-mono text-xs text-[#8185a0] mt-1">
                Inject a live delivery into the Doha event pipeline to test real-time synchronization between your phone and laptop.
              </p>
            </div>
            {createdOrderCode && (
              <div className="flex items-center gap-2 rounded-[6px] border border-[#10b981]/50 bg-[#10b981]/15 px-3 py-1.5 font-mono text-xs text-[#10b981]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Created: #{createdOrderCode}</span>
                <Link href={`/track/${createdOrderCode}`} className="underline font-bold hover:text-white">
                  Track Live
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleInstantDispatch('pearl')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-[10px] border border-[#0428cb]/60 bg-[#0428cb]/20 p-4 text-left transition-all hover:border-[#34fcff] hover:bg-[#0428cb]/30 disabled:opacity-50 group shadow-md"
            >
              <div>
                <span className="font-mono text-[10px] font-bold text-[#34fcff]">PRESET 01 · LUXURY</span>
                <div className="text-sm font-bold text-white mt-0.5">Souq Waqif → The Pearl</div>
                <div className="text-xs text-[#8185a0]">Artisan Coffee &amp; Confectionery</div>
              </div>
              <Zap className="h-5 w-5 text-[#34fcff] transition-transform group-hover:scale-110" />
            </button>

            <button
              onClick={() => handleInstantDispatch('lusail')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-[10px] border border-[#0428cb]/60 bg-[#0428cb]/20 p-4 text-left transition-all hover:border-[#34fcff] hover:bg-[#0428cb]/30 disabled:opacity-50 group shadow-md"
            >
              <div>
                <span className="font-mono text-[10px] font-bold text-[#34fcff]">PRESET 02 · EXPRESS</span>
                <div className="text-sm font-bold text-white mt-0.5">West Bay → Lusail Marina</div>
                <div className="text-xs text-[#8185a0]">Tech Hardware &amp; VIP Docs</div>
              </div>
              <Zap className="h-5 w-5 text-[#34fcff] transition-transform group-hover:scale-110" />
            </button>

            <button
              onClick={() => handleInstantDispatch('katara')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-[10px] border border-[#0428cb]/60 bg-[#0428cb]/20 p-4 text-left transition-all hover:border-[#34fcff] hover:bg-[#0428cb]/30 disabled:opacity-50 group shadow-md"
            >
              <div>
                <span className="font-mono text-[10px] font-bold text-[#34fcff]">PRESET 03 · VIP</span>
                <div className="text-sm font-bold text-white mt-0.5">Al Waab → Katara Village</div>
                <div className="text-xs text-[#8185a0]">VIP Passes &amp; Presentation</div>
              </div>
              <Zap className="h-5 w-5 text-[#34fcff] transition-transform group-hover:scale-110" />
            </button>
          </div>
        </div>

        {/* Technical Architecture Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-[10px] border border-[#131e5c] bg-[#02093a]/50 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#34fcff]">
              <Database className="h-4 w-4" />
              <span>POSTGRESQL &amp; PRISMA</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-white">Strict Order State Machine</div>
            <p className="mt-1 text-xs text-[#8185a0] leading-relaxed">
              Persists transactional state changes with zero high-frequency GPS ping writes, protecting ACID integrity.
            </p>
          </div>

          <div className="rounded-[10px] border border-[#131e5c] bg-[#02093a]/50 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#34fcff]">
              <Server className="h-4 w-4" />
              <span>REDIS TELEMETRY CACHE</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-white">Sub-millisecond In-Memory Store</div>
            <p className="mt-1 text-xs text-[#8185a0] leading-relaxed">
              Caches driver GPS coordinates using key pattern <code className="text-[#34fcff]">driver:&#123;id&#125;:location</code> with automated rolling TTL.
            </p>
          </div>

          <div className="rounded-[10px] border border-[#131e5c] bg-[#02093a]/50 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#34fcff]">
              <Activity className="h-4 w-4" />
              <span>SOCKET.IO EVENT LOOP</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-white">Bi-Directional Room Dispatch</div>
            <p className="mt-1 text-xs text-[#8185a0] leading-relaxed">
              Distributes telemetry to <code className="text-[#34fcff]">admin</code> and <code className="text-[#34fcff]">order:&#123;id&#125;</code> rooms, keeping phone and laptop synchronized.
            </p>
          </div>
        </div>
      </div>

      <PhoneConnectModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} />
    </div>
  );
}
