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
  ExternalLink,
} from 'lucide-react';
import { PhoneConnectModal } from './PhoneConnectModal';

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
    { href: '/admin', label: 'Operations & Map' },
    { href: '/rider', label: 'Rider App (PWA)' },
    { href: '/track/ZG-QTR-9021', label: 'Customer Tracking' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs shadow-md">
                ZG
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  Zeego <span className="text-blue-500 font-normal">Delivery</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Qatar Dispatch Platform
                </span>
              </div>
            </Link>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-800">
              {navLinks.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right User & Utility Controls */}
          <div className="flex items-center gap-3">
            {/* Live Socket Status Badge */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
                }`}
              />
              <span className="font-mono text-[11px] text-slate-300">
                {isConnected ? 'Telemetry Active' : 'Disconnected'}
              </span>
            </div>

            {/* Test on Phone QR Button */}
            <button
              onClick={() => setShowPhoneModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
            >
              <Smartphone className="h-3.5 w-3.5 text-blue-400" />
              <span className="hidden sm:inline">Phone QR</span>
            </button>

            {/* Active Role / User Info */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 font-semibold text-xs text-blue-400 border border-slate-700">
                  {user.avatar}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">
                    {user.role}
                  </span>
                </div>
                <Link
                  href="/login"
                  className="rounded p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Switch Role / Account"
                >
                  <User className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
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
