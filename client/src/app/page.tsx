'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Truck,
  Navigation as NavIcon,
  Plus,
  CheckCircle2,
  ArrowRight,
  Database,
  Server,
  Activity,
  Smartphone,
  Shield,
  Zap,
} from 'lucide-react';
import { createOrder } from '@/lib/api';
import { PhoneConnectModal } from '@/components/PhoneConnectModal';

export default function OverviewPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const handleInstantDispatch = async (preset: 'pearl' | 'lusail' | 'katara') => {
    setIsCreating(true);
    setCreatedOrderCode(null);

    const presets = {
      pearl: {
        pickupAddress: 'Souq Waqif Logistics Bay, Doha',
        pickupLat: 25.2867,
        pickupLng: 51.5333,
        dropoffAddress: 'Tower 22, Porto Arabia, The Pearl',
        dropoffLat: 25.3713,
        dropoffLng: 51.5478,
        customerName: 'Fatima Al-Kuwari',
        customerPhone: '+974 6600 5678',
        itemsDescription: 'Gourmet Hamper & Documents',
      },
      lusail: {
        pickupAddress: 'City Center Financial Tower, West Bay',
        pickupLat: 25.3255,
        pickupLng: 51.5322,
        dropoffAddress: 'Marina Promenade, Lusail City',
        dropoffLat: 25.4190,
        dropoffLng: 51.5262,
        customerName: 'Sheikh Nasser Al-Thani',
        customerPhone: '+974 7711 9900',
        itemsDescription: 'High Priority Tech Pack',
      },
      katara: {
        pickupAddress: 'Villaggio Mall Cargo Bay, Al Waab',
        pickupLat: 25.2600,
        pickupLng: 51.4420,
        dropoffAddress: 'Katara Cultural Village Gate 4',
        dropoffLat: 25.3570,
        dropoffLng: 51.5240,
        customerName: 'Amina Al-Sulaiti',
        customerPhone: '+974 5599 3322',
        itemsDescription: 'VIP Event Passes',
      },
    };

    try {
      const newOrder = await createOrder(presets[preset]);
      setCreatedOrderCode(newOrder.trackingCode);
    } catch (err) {
      console.error('Failed to create order:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-medium text-blue-400 mb-4">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Zeego Delivery Technology · Qatar</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl sm:leading-tight">
            Real-Time Last-Mile <br />
            <span className="text-blue-500">Dispatch Platform</span>
          </h1>

          <p className="mt-4 text-sm text-slate-400 sm:text-base leading-relaxed">
            Production-scale event-driven engine syncing fleet locations between dispatchers,
            couriers, and customers across Doha without manual browser refreshes.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all"
            >
              <Compass className="h-4 w-4" />
              <span>Open Operations Dashboard</span>
            </Link>

            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:text-white transition-all"
            >
              <Shield className="h-4 w-4 text-sky-400" />
              <span>Switch User Role (RBAC)</span>
            </Link>

            <button
              onClick={() => setShowPhoneModal(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:text-white transition-all"
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>Phone QR Connect</span>
            </button>
          </div>
        </div>

        {/* 3 Main Role Portals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Admin Operations */}
          <Link
            href="/admin"
            className="group rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-blue-500 hover:bg-slate-900/90 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-4">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                Dispatcher Command
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Live interactive MapLibre map with dynamic vehicle rotation, real-time unassigned order queue, and fleet metrics table.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-blue-400">
              <span>Enter Dispatch Center</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 2: Rider App */}
          <Link
            href="/rider"
            className="group rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-blue-500 hover:bg-slate-900/90 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600/10 text-sky-400 border border-sky-500/20 mb-4">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors">
                Rider App (Mobile PWA)
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Mobile-first cockpit for couriers with real-time GPS streaming, one-tap order acceptance, and realistic Doha Corniche driving simulator.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-sky-400">
              <span>Open Rider Cockpit</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 3: Customer Tracking */}
          <Link
            href="/track/ZG-QTR-9021"
            className="group rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-blue-500 hover:bg-slate-900/90 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 mb-4">
                <NavIcon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                Customer Live Tracking
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Public tracking link with 3-step progress bar (Preparing ➔ En Route ➔ Delivered), live courier map, and verified driver contact.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span>View Tracking Demo</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* Instant Order Ingestion Simulator */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Quick Delivery Injector</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any preset to ingest a real delivery into the system and observe live multi-tab dispatch.
              </p>
            </div>

            {createdOrderCode && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Created #{createdOrderCode}</span>
                <Link href={`/track/${createdOrderCode}`} className="underline font-bold hover:text-white">
                  Track →
                </Link>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleInstantDispatch('pearl')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3.5 text-left transition-all hover:border-blue-500 hover:bg-slate-900 disabled:opacity-50"
            >
              <div>
                <span className="text-[10px] font-semibold text-blue-400 font-mono">DOHA PRESET 1</span>
                <div className="text-xs font-semibold text-white mt-0.5">Souq Waqif ➔ The Pearl</div>
                <div className="text-[11px] text-slate-400">Fatima Al-Kuwari</div>
              </div>
              <Plus className="h-4 w-4 text-slate-400" />
            </button>

            <button
              onClick={() => handleInstantDispatch('lusail')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3.5 text-left transition-all hover:border-blue-500 hover:bg-slate-900 disabled:opacity-50"
            >
              <div>
                <span className="text-[10px] font-semibold text-sky-400 font-mono">DOHA PRESET 2</span>
                <div className="text-xs font-semibold text-white mt-0.5">West Bay ➔ Lusail Marina</div>
                <div className="text-[11px] text-slate-400">Sheikh Nasser Al-Thani</div>
              </div>
              <Plus className="h-4 w-4 text-slate-400" />
            </button>

            <button
              onClick={() => handleInstantDispatch('katara')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3.5 text-left transition-all hover:border-blue-500 hover:bg-slate-900 disabled:opacity-50"
            >
              <div>
                <span className="text-[10px] font-semibold text-emerald-400 font-mono">DOHA PRESET 3</span>
                <div className="text-xs font-semibold text-white mt-0.5">Al Waab ➔ Katara Village</div>
                <div className="text-[11px] text-slate-400">Amina Al-Sulaiti</div>
              </div>
              <Plus className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Architectural Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-800/80">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Database className="h-4 w-4 text-blue-400" />
              <span>PostgreSQL &amp; Prisma ORM</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transactional integrity for delivery status changes with zero high-frequency GPS writes to the disk.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Server className="h-4 w-4 text-sky-400" />
              <span>Redis Telemetry Cache</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              High-frequency GPS sensor pings (<code className="text-slate-300 font-mono text-[11px]">driver:&#123;id&#125;:location</code>) stored in-memory with automatic rolling TTL.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Socket.io WebSocket Hub</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bi-directional room multiplexing delivering coordinate streams to dispatchers and tracking clients simultaneously.
            </p>
          </div>
        </div>
      </div>

      <PhoneConnectModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} />
    </div>
  );
}
