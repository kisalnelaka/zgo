'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import {
  Compass,
  Navigation as NavIcon,
  Truck,
  BarChart3,
  Smartphone,
  LogOut,
  User,
  Radio,
  FileCode2,
} from 'lucide-react';
import { PhoneConnectModal } from './PhoneConnectModal';
import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/admin', label: 'Operations & Fleet' },
    { href: '/rider', label: 'Rider Cockpit' },
    { href: '/track/ZG-QTR-9021', label: 'Live Tracking' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-md-outline/15 bg-md-surface/85 backdrop-blur-md transition-colors duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-md-primary font-bold text-md-on-primary text-xs shadow-md transition-transform duration-300 group-hover:scale-105 active:scale-95">
                ZG
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-md-on-surface flex items-center gap-1.5">
                  Zeego <span className="text-md-primary font-normal">Pulse</span>
                </span>
                <span className="text-[10px] text-md-on-surface-variant font-mono">
                  Qatar Last-Mile Engine
                </span>
              </div>
            </Link>

            {/* Nav Links (Material You Pill System) */}
            <nav className="hidden md:flex items-center gap-1.5 pl-4 border-l border-md-outline/15">
              {navLinks.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 active:scale-95 ${
                      isActive
                        ? 'bg-md-secondary-container text-md-on-secondary-container shadow-sm font-semibold'
                        : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-primary/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <a
                href="/api/docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium text-md-on-surface-variant hover:text-md-primary hover:bg-md-primary/10 transition-colors"
                title="OpenAPI 3.0 Interactive Documentation"
              >
                <FileCode2 className="w-3.5 h-3.5 text-md-primary" />
                <span>Swagger API</span>
              </a>
            </nav>
          </div>

          {/* Right User & Utility Controls */}
          <div className="flex items-center gap-2.5">
            {/* Live Socket Status Badge */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-md-outline/15 bg-md-surface-container px-3 py-1 text-xs shadow-sm">
              <span
                className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                  isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'
                }`}
              />
              <span className="font-mono text-[11px] text-md-on-surface-variant">
                {isConnected ? 'Telemetry Active' : 'Offline'}
              </span>
            </div>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle />

            {/* Test on Phone QR Button */}
            <button
              onClick={() => setShowPhoneModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-md-outline/20 bg-md-surface-container hover:bg-md-secondary-container text-md-on-surface px-3.5 py-1.5 text-xs font-medium transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md"
              title="Connect Real Mobile Device"
            >
              <Smartphone className="h-3.5 w-3.5 text-md-primary" />
              <span className="hidden sm:inline">Phone QR</span>
            </button>

            {/* Active Role / User Info */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-md-outline/15">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-secondary-container font-semibold text-xs text-md-on-secondary-container border border-md-outline/20 shadow-sm">
                  {user.avatar}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-medium text-md-on-surface truncate max-w-[120px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-md-on-surface-variant uppercase font-mono">
                    {user.role}
                  </span>
                </div>
                <Link
                  href="/login"
                  className="rounded-full p-1.5 text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container transition-colors"
                  title="Switch Role / Account"
                >
                  <User className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-md-primary text-md-on-primary px-4 py-1.5 text-xs font-medium hover:bg-md-primary/90 active:scale-95 shadow-sm transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <PhoneConnectModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} />
    </>
  );
}
