'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { Radio, Compass, Navigation as NavIcon, Truck, ShieldCheck } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(false);

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
    { href: '/', label: 'COMMAND HUB', icon: Radio },
    { href: '/admin', label: 'ADMIN OPS', icon: Compass },
    { href: '/rider', label: 'RIDER COCKPIT', icon: Truck },
    { href: '/track/ZG-QTR-9021', label: 'CUSTOMER TRACKING', icon: NavIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#131e5c] bg-[#00052e]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Market Identity */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0428cb] shadow-blue-glow transition-transform group-hover:scale-105">
              <span className="font-mono text-xs font-bold text-white">ZG</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wider text-white">
                ZEEGO <span className="text-[#34fcff]">PULSE</span>
              </span>
              <span className="font-mono text-[10px] tracking-widest text-[#6b6b83]">
                LAST-MILE ENGINE · DOHA
              </span>
            </div>
          </Link>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-[8px] px-3 py-2 text-xs font-medium tracking-wider transition-colors ${
                  isActive
                    ? 'bg-[#0428cb]/20 text-[#34fcff] border border-[#34fcff]/30'
                    : 'text-[#8185a0] hover:text-white hover:bg-[#02093a]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#131e5c] bg-[#02093a] px-3 py-1 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-[#10b981] shadow-[0_0_8px_#10b981]' : 'bg-[#ef4444]'
              }`}
            />
            <span className="font-mono text-[11px] text-[#8185a0]">
              {isConnected ? 'STREAMING ACTIVE' : 'RECONNECTING'}
            </span>
          </div>

          <span className="rounded-[4px] border border-[#0428cb]/50 bg-[#0428cb]/10 px-2 py-0.5 font-mono text-[10px] text-[#afb4db]">
            QATAR HQ
          </span>
        </div>
      </div>
    </header>
  );
}
