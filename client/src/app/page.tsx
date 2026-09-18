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
  RotateCcw,
  FileCode2,
} from 'lucide-react';
import { createOrder } from '@/lib/api';
import { PhoneConnectModal } from '@/components/PhoneConnectModal';

export default function OverviewPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleInstantDispatch = async (preset: 'pearl' | 'lusail' | 'katara') => {
    setIsCreating(true);
    setCreatedOrderCode(null);

    const presets = {
      pearl: {
        pickupAddress: 'Souq Waqif Logistics Bay, Doha',
        pickupLat: 25.2867,
        pickupLng: 51.5333,
        dropoffAddress: 'Tower 22, Porto Arabia, The Pearl-Qatar',
        dropoffLat: 25.3713,
        dropoffLng: 51.5478,
        customerName: 'Fatima Al-Kuwari',
        customerPhone: '+974 6600 5678',
        itemsDescription: 'Gourmet Pastries & Specialty Roast',
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
        itemsDescription: 'High Priority Legal Tech Pack',
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
        itemsDescription: 'VIP Diplomatic Accreditation Pass',
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

  const handleResetDemoState = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setResetMessage('Demo test dataset reinstated successfully (3 Drivers, 4 Doha Orders).');
        setTimeout(() => setResetMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to reset demo dataset:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-md-surface px-4 py-10 sm:px-6 lg:px-8 text-md-on-surface overflow-hidden transition-colors duration-300">
      {/* Material You Atmospheric Layered Blur Shapes */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-md-primary/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-md-tertiary/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-md-secondary-container/30 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl space-y-12">
        {/* Hero Container */}
        <section className="relative rounded-[32px] sm:rounded-[48px] bg-md-surface-container p-8 sm:p-14 shadow-sm border border-md-outline/10 text-center overflow-hidden">
          <div className="inline-flex items-center gap-2 rounded-full bg-md-secondary-container px-4 py-1.5 text-xs font-semibold text-md-on-secondary-container mb-6 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-md-primary animate-pulse" />
            <span>Fast. Safe. Reliable Deliveries. Doha, Qatar</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-md-on-surface sm:text-5xl sm:leading-tight">
            Real-Time Last-Mile <br />
            <span className="text-md-primary">Dispatch Engine</span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-md-on-surface-variant leading-relaxed font-normal">
            Connecting businesses to customers with smart, secure, and seamless delivery solutions.
            High-throughput event-driven architecture synchronizing courier telemetry, dispatch operations, and customer tracking across Qatar.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-full bg-md-primary text-md-on-primary px-6 py-3 text-xs font-medium shadow-sm hover:shadow-md hover:bg-md-primary/90 active:scale-95 transition-all duration-300"
            >
              <Compass className="h-4 w-4" />
              <span>Dispatcher Command Center</span>
            </Link>

            <Link
              href="/rider"
              className="flex items-center gap-2 rounded-full bg-md-secondary-container text-md-on-secondary-container px-5 py-3 text-xs font-medium shadow-sm hover:shadow-md active:scale-95 transition-all duration-300"
            >
              <Truck className="h-4 w-4 text-md-primary" />
              <span>Rider Cockpit (PWA)</span>
            </Link>

            <button
              onClick={() => setShowPhoneModal(true)}
              className="flex items-center gap-2 rounded-full border border-md-outline/25 bg-md-surface hover:bg-md-surface-low text-md-on-surface px-5 py-3 text-xs font-medium shadow-sm hover:shadow-md active:scale-95 transition-all duration-300"
            >
              <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Phone QR Connect</span>
            </button>

            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-md-outline/25 bg-md-surface hover:bg-md-surface-low text-md-on-surface px-5 py-3 text-xs font-medium shadow-sm hover:shadow-md active:scale-95 transition-all duration-300"
            >
              <FileCode2 className="h-4 w-4 text-md-primary" />
              <span>Swagger API Docs</span>
            </a>
          </div>

          {/* Instant Demo Reset Bar */}
          <div className="mt-8 pt-6 border-t border-md-outline/10 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleResetDemoState}
              disabled={isResetting}
              className="flex items-center gap-2 rounded-full bg-md-surface-low hover:bg-md-secondary-container text-md-on-surface px-4 py-2 text-xs font-medium border border-md-outline/20 active:scale-95 transition-all"
            >
              <RotateCcw className={`h-3.5 w-3.5 text-md-primary ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Reinstating Test Data...' : 'Reinstate Clean Demo Dataset'}</span>
            </button>

            {resetMessage && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ {resetMessage}
              </span>
            )}
          </div>
        </section>

        {/* 3 Material You Role Portals */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Portal 1: Dispatcher */}
          <Link
            href="/admin"
            className="group rounded-[24px] bg-md-surface-container p-7 transition-all duration-300 hover:shadow-md hover:scale-[1.02] border border-md-outline/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-md-secondary-container text-md-primary mb-5 shadow-sm">
                <Compass className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-md-on-surface group-hover:text-md-primary transition-colors">
                Dispatcher Operations
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-md-on-surface-variant leading-relaxed">
                Full-screen interactive MapLibre map with dynamic courier orientation, real-time unassigned order queue, and live fleet telemetry metrics.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-md-primary">
              <span>Open Operations Console</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Portal 2: Rider */}
          <Link
            href="/rider"
            className="group rounded-[24px] bg-md-surface-container p-7 transition-all duration-300 hover:shadow-md hover:scale-[1.02] border border-md-outline/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-md-tertiary-container text-md-on-tertiary-container mb-5 shadow-sm">
                <Truck className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-md-on-surface group-hover:text-md-primary transition-colors">
                Rider Cockpit (PWA)
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-md-on-surface-variant leading-relaxed">
                Mobile-first courier application with live HTML5 Geolocation streaming, 1-tap dispatch acceptance, and realistic Doha Corniche driving simulator.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-md-primary">
              <span>Launch Rider App</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Portal 3: Customer */}
          <Link
            href="/track/ZG-QTR-9021"
            className="group rounded-[24px] bg-md-surface-container p-7 transition-all duration-300 hover:shadow-md hover:scale-[1.02] border border-md-outline/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-5 shadow-sm">
                <NavIcon className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-md-on-surface group-hover:text-md-primary transition-colors">
                Customer Live Tracking
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-md-on-surface-variant leading-relaxed">
                Secure customer tracking link with 3-stage progress visualization (Preparing ➔ En Route ➔ Delivered), live courier map, and verified driver contact.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-md-primary">
              <span>View Live Delivery</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </section>

        {/* Quick Order Dispatcher Section */}
        <section className="rounded-[28px] bg-md-surface-container p-7 sm:p-8 shadow-sm border border-md-outline/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-md-outline/10 pb-5">
            <div>
              <h2 className="text-base font-bold text-md-on-surface flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Instant Delivery Injector (Doha Corridors)</span>
              </h2>
              <p className="text-xs text-md-on-surface-variant mt-1">
                Trigger high-frequency orders across Doha to test WebSocket multi-device synchronization in real-time.
              </p>
            </div>

            {createdOrderCode && (
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-4 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Created #{createdOrderCode}</span>
                <Link href={`/track/${createdOrderCode}`} className="underline font-bold hover:opacity-80">
                  Track →
                </Link>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              onClick={() => handleInstantDispatch('pearl')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-2xl border border-md-outline/15 bg-md-surface p-4 text-left transition-all duration-300 hover:shadow-md hover:border-md-primary active:scale-95 disabled:opacity-50"
            >
              <div>
                <span className="text-[10px] font-semibold text-md-primary font-mono">DOHA CORRIDOR 1</span>
                <div className="text-xs font-bold text-md-on-surface mt-0.5">Souq Waqif ➔ The Pearl</div>
                <div className="text-[11px] text-md-on-surface-variant">Fatima Al-Kuwari</div>
              </div>
              <Plus className="h-4 w-4 text-md-on-surface-variant" />
            </button>

            <button
              onClick={() => handleInstantDispatch('lusail')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-2xl border border-md-outline/15 bg-md-surface p-4 text-left transition-all duration-300 hover:shadow-md hover:border-md-primary active:scale-95 disabled:opacity-50"
            >
              <div>
                <span className="text-[10px] font-semibold text-md-tertiary font-mono">DOHA CORRIDOR 2</span>
                <div className="text-xs font-bold text-md-on-surface mt-0.5">West Bay ➔ Lusail Marina</div>
                <div className="text-[11px] text-md-on-surface-variant">Sheikh Nasser Al-Thani</div>
              </div>
              <Plus className="h-4 w-4 text-md-on-surface-variant" />
            </button>

            <button
              onClick={() => handleInstantDispatch('katara')}
              disabled={isCreating}
              className="flex items-center justify-between rounded-2xl border border-md-outline/15 bg-md-surface p-4 text-left transition-all duration-300 hover:shadow-md hover:border-md-primary active:scale-95 disabled:opacity-50"
            >
              <div>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">DOHA CORRIDOR 3</span>
                <div className="text-xs font-bold text-md-on-surface mt-0.5">Al Waab ➔ Katara Village</div>
                <div className="text-[11px] text-md-on-surface-variant">Amina Al-Sulaiti</div>
              </div>
              <Plus className="h-4 w-4 text-md-on-surface-variant" />
            </button>
          </div>
        </section>

        {/* Architectural Pillars (Material You Tonal Cards) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-md-outline/10">
          <div className="rounded-2xl bg-md-surface-container p-5 border border-md-outline/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-md-on-surface">
              <Database className="h-4 w-4 text-md-primary" />
              <span>PostgreSQL &amp; Prisma ORM</span>
            </div>
            <p className="text-xs text-md-on-surface-variant leading-relaxed">
              Strict transactional boundary isolating persistent business mutations from write-heavy GPS sensor noise.
            </p>
          </div>

          <div className="rounded-2xl bg-md-surface-container p-5 border border-md-outline/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-md-on-surface">
              <Server className="h-4 w-4 text-md-tertiary" />
              <span>Redis Telemetry Cache</span>
            </div>
            <p className="text-xs text-md-on-surface-variant leading-relaxed">
              In-memory geospatial coordinate store with rolling TTL (<code className="text-xs font-mono text-md-primary">driver:&#123;id&#125;:location</code>) providing sub-5ms lookups.
            </p>
          </div>

          <div className="rounded-2xl bg-md-surface-container p-5 border border-md-outline/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-md-on-surface">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Socket.io WebSocket Hub</span>
            </div>
            <p className="text-xs text-md-on-surface-variant leading-relaxed">
              Room-multiplexed telemetry transport streaming GPS updates to dispatchers and tracking clients simultaneously.
            </p>
          </div>
        </section>
      </div>

      <PhoneConnectModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} />
    </div>
  );
}
