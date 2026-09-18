'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { Radio, Compass, Navigation as NavIcon, Truck, Smartphone, QrCode } from 'lucide-react';
import { PhoneConnectModal } from './PhoneConnectModal';

export function Navigation() {
  const pathname = usePathname();
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
    { href: '/', label: 'COMMAND HUB', icon: Radio },
    { href: '/admin', label: 'ADMIN OPS', icon: Compass },
    { href: '/rider', label: 'RIDER COCKPIT', icon: Truck },
    { href: '/track/ZG-QTR-9021', label: 'CUSTOMER TRACKING', icon: NavIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#131e5c] bg-[#00052e]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand & Market Identity */}
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#0428cb] to-[#34fcff] shadow-cyan-glow transition-transform group-hover:scale-105">
                <span className="font-mono text-xs font-bold text-white tracking-wider">ZG</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-wider text-white">
                  ZEEGO <span className="text-[#34fcff]">PULSE</span>
                </span>
                <span className="font-mono text-[9px] tracking-widest text-[#8185a0]">
                  REAL-TIME DISPATCH · DOHA
                </span>
              </div>
            </Link>
          </div>

          {/* Center Nav Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-[8px] px-3.5 py-2 text-xs font-semibold tracking-wider transition-all ${
                    isActive
                      ? 'bg-[#0428cb]/30 text-[#34fcff] border border-[#34fcff]/50 shadow-cyan-glow'
                      : 'text-[#8185a0] hover:text-white hover:bg-[#02093a] border border-transparent'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Phone Connect & Status */}
          <div className="flex items-center gap-2.5">
            {/* Quick Phone Connect Button */}
            <button
              onClick={() => setShowPhoneModal(true)}
              className="flex items-center gap-1.5 rounded-[8px] border border-[#34fcff]/60 bg-[#0428cb]/20 px-3 py-1.5 text-xs font-semibold text-[#34fcff] shadow-cyan-glow transition-all hover:bg-[#0428cb]/40 hover:scale-105"
            >
              <QrCode className="h-3.5 w-3.5 text-[#34fcff]" />
              <span className="hidden sm:inline">CONNECT PHONE</span>
            </button>

            {/* Socket Streaming Indicator */}
            <div className="flex items-center gap-2 rounded-full border border-[#131e5c] bg-[#02093a] px-3 py-1 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-[#10b981] shadow-[0_0_8px_#10b981]' : 'bg-[#ef4444]'
                }`}
              />
              <span className="font-mono text-[10px] text-[#8185a0] hidden sm:inline">
                {isConnected ? 'TELEMETRY LIVE' : 'CONNECTING'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* QR Code Phone Connect Modal */}
      <PhoneConnectModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} />
    </>
  );
}
