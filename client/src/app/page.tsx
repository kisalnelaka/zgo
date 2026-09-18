'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Compass, Truck, Navigation as NavIcon, Zap, CheckCircle2, ArrowRight, Activity, Database, Server, RefreshCw } from 'lucide-react';
import { createOrder } from '@/lib/api';

export default function CommandHubPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null);

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
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#00052e] px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Radial Glow Wash */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#06105a] to-transparent opacity-60 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Eyebrow and Editorial Display Headline */}
        <div className="mb-12 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-[4px] border border-[#0428cb]/50 bg-[#0428cb]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-[#34fcff]">
            <Zap className="h-3 w-3" />
            <span>ZEEGO LAST-MILE LOGISTICS · QATAR PORTFOLIO SPECIFICATION</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-light tracking-[-0.03em] text-white sm:text-6xl sm:leading-[1.15]">
            Real-Time Last-Mile <br />
            <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-white via-[#afb4db] to-[#34fcff]">
              Dispatch Engine
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#8185a0] sm:text-base">
            Event-driven telemetry architecture syncing live physical coordinates across
            Admin, Rider, and Customer clients without manual browser refreshes.
          </p>
        </div>

        {/* 3 Core Interactive Entry Portals */}
        <div className="mb-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1: Admin Operations */}
          <Link
            href="/admin"
            className="group relative flex flex-col justify-between rounded-[8px] border border-[#131e5c] bg-[#02093a]/80 p-6 backdrop-blur-sm transition-all hover:border-[#34fcff]/60 hover:shadow-cyan-glow"
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#0428cb]/20 text-[#34fcff] border border-[#0428cb]">
                  <Compass className="h-5 w-5" />
                </div>
                <span className="font-mono text-[11px] tracking-wider text-[#6b6b83]">INTERFACE 01</span>
              </div>
              <h3 className="text-xl font-semibold text-white group-hover:text-[#34fcff] transition-colors">
                Admin Operations
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#8185a0]">
                Fullscreen Mapbox map rendering live driver positions via WebSocket rooms. Unassigned order queue with one-click manual dispatch.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-[#34fcff]">
              <span>Launch Mission Control</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 2: Rider Mobile Cockpit */}
          <Link
            href="/rider"
            className="group relative flex flex-col justify-between rounded-[8px] border border-[#131e5c] bg-[#02093a]/80 p-6 backdrop-blur-sm transition-all hover:border-[#34fcff]/60 hover:shadow-cyan-glow"
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#0428cb]/20 text-[#34fcff] border border-[#0428cb]">
                  <Truck className="h-5 w-5" />
                </div>
                <span className="font-mono text-[11px] tracking-wider text-[#6b6b83]">INTERFACE 02</span>
              </div>
              <h3 className="text-xl font-semibold text-white group-hover:text-[#34fcff] transition-colors">
                Rider Cockpit (PWA)
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#8185a0]">
                Mobile-first driver dashboard. Real-time GPS stream with an interactive Doha Route Simulator to test live motion without field walking.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-[#34fcff]">
              <span>Open Rider Terminal</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 3: Customer Tracking */}
          <Link
            href="/track/ZG-QTR-9021"
            className="group relative flex flex-col justify-between rounded-[8px] border border-[#131e5c] bg-[#02093a]/80 p-6 backdrop-blur-sm transition-all hover:border-[#34fcff]/60 hover:shadow-cyan-glow"
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#0428cb]/20 text-[#34fcff] border border-[#0428cb]">
                  <NavIcon className="h-5 w-5" />
                </div>
                <span className="font-mono text-[11px] tracking-wider text-[#6b6b83]">INTERFACE 03</span>
              </div>
              <h3 className="text-xl font-semibold text-white group-hover:text-[#34fcff] transition-colors">
                Customer Tracking
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#8185a0]">
                Public tracking link with live delivery progress stage bar, dynamic driver vehicle trajectory, and simulated Qatar SMS alerts.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-[#34fcff]">
              <span>Inspect Tracking View</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* Quick Dispatch Demo Launcher */}
        <div className="mb-14 rounded-[8px] border border-[#131e5c] bg-[#02093a]/60 p-6 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#131e5c] pb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Instant Order Ingestion & Dispatch Test</h2>
              <p className="font-mono text-xs text-[#8185a0]">
                Trigger a live delivery into the Doha event loop to observe real-time dispatch across tabs.
              </p>
            </div>
            {createdOrderCode && (
              <div className="flex items-center gap-2 rounded-[4px] border border-[#10b981]/40 bg-[#10b981]/10 px-3 py-1 font-mono text-xs text-[#10b981]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Created Order: {createdOrderCode}</span>
                <Link href={`/track/${createdOrderCode}`} className="underline hover:text-white">
                  Track Live
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleInstantDispatch('pearl')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-[8px] border border-[#0428cb]/50 bg-[#0428cb]/20 p-4 text-left transition-all hover:border-[#34fcff] hover:bg-[#0428cb]/30 disabled:opacity-50"
            >
              <div>
                <span className="font-mono text-[10px] text-[#34fcff]">PRESET 01 · LUXURY</span>
                <div className="text-sm font-semibold text-white">Souq Waqif → The Pearl</div>
                <div className="text-xs text-[#8185a0]">Artisan Coffee & Gifts</div>
              </div>
              <Zap className="h-4 w-4 text-[#34fcff]" />
            </button>

            <button
              onClick={() => handleInstantDispatch('lusail')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-[8px] border border-[#0428cb]/50 bg-[#0428cb]/20 p-4 text-left transition-all hover:border-[#34fcff] hover:bg-[#0428cb]/30 disabled:opacity-50"
            >
              <div>
                <span className="font-mono text-[10px] text-[#34fcff]">PRESET 02 · EXPRESS</span>
                <div className="text-sm font-semibold text-white">West Bay → Lusail Marina</div>
                <div className="text-xs text-[#8185a0]">Tech Hardware & Docs</div>
              </div>
              <Zap className="h-4 w-4 text-[#34fcff]" />
            </button>

            <button
              onClick={() => handleInstantDispatch('katara')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-[8px] border border-[#0428cb]/50 bg-[#0428cb]/20 p-4 text-left transition-all hover:border-[#34fcff] hover:bg-[#0428cb]/30 disabled:opacity-50"
            >
              <div>
                <span className="font-mono text-[10px] text-[#34fcff]">PRESET 03 · VIP</span>
                <div className="text-sm font-semibold text-white">Al Waab → Katara Village</div>
                <div className="text-xs text-[#8185a0]">VIP Passes & Presentation</div>
              </div>
              <Zap className="h-4 w-4 text-[#34fcff]" />
            </button>
          </div>
        </div>

        {/* Technical Architecture Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-[8px] border border-[#131e5c] bg-[#02093a]/40 p-5">
            <div className="flex items-center gap-2 font-mono text-xs text-[#34fcff]">
              <Database className="h-4 w-4" />
              <span>POSTGRESQL &amp; PRISMA</span>
            </div>
            <div className="mt-2 text-sm font-medium text-white">Strict Order State Machine</div>
            <p className="mt-1 text-xs text-[#8185a0]">
              Persists transactional state changes (PENDING, ASSIGNED, IN_TRANSIT, DELIVERED) with zero high-frequency GPS ping writes.
            </p>
          </div>

          <div className="rounded-[8px] border border-[#131e5c] bg-[#02093a]/40 p-5">
            <div className="flex items-center gap-2 font-mono text-xs text-[#34fcff]">
              <Server className="h-4 w-4" />
              <span>REDIS TELEMETRY CACHE</span>
            </div>
            <div className="mt-2 text-sm font-medium text-white">Sub-millisecond In-Memory Store</div>
            <p className="mt-1 text-xs text-[#8185a0]">
              Caches driver GPS coordinates using key pattern <code className="text-[#34fcff]">driver:&#123;id&#125;:location</code> with automated TTL and zero disk I/O overhead.
            </p>
          </div>

          <div className="rounded-[8px] border border-[#131e5c] bg-[#02093a]/40 p-5">
            <div className="flex items-center gap-2 font-mono text-xs text-[#34fcff]">
              <Activity className="h-4 w-4" />
              <span>SOCKET.IO EVENT LOOP</span>
            </div>
            <div className="mt-2 text-sm font-medium text-white">Bi-Directional Room Dispatch</div>
            <p className="mt-1 text-xs text-[#8185a0]">
              Distributes telemetry to <code className="text-[#34fcff]">admin</code> and <code className="text-[#34fcff]">order:&#123;id&#125;</code> rooms, keeping all active screens in sync with zero browser refresh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
