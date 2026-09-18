'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, QrCode, Copy, Check, X, Wifi, Radio } from 'lucide-react';

interface PhoneConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PhoneConnectModal({ isOpen, onClose }: PhoneConnectModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [mobileUrl, setMobileUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use LAN IP or current window host
      const host = window.location.hostname === 'localhost' ? '192.168.100.70' : window.location.hostname;
      const port = window.location.port || '3000';
      const url = `http://${host}:${port}/rider`;
      setMobileUrl(url);

      QRCode.toDataURL(url, {
        width: 240,
        margin: 2,
        color: {
          dark: '#34fcff',
          light: '#00052e',
        },
      })
        .then((dataUri) => setQrDataUrl(dataUri))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-[12px] border border-[#34fcff]/40 bg-[#00052e] p-6 shadow-2xl shadow-[#0428cb]/30">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-[#6b6b83] hover:bg-[#02093a] hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#131e5c] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#0428cb]/20 text-[#34fcff] border border-[#0428cb]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Connect Mobile Phone</h3>
            <p className="font-mono text-xs text-[#8185a0]">Install & Test Rider Cockpit on Device</p>
          </div>
        </div>

        {/* QR Code Canvas */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative rounded-[12px] border-2 border-[#34fcff]/60 bg-[#00052e] p-3 shadow-cyan-glow">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scan QR Code to open Rider App" className="h-48 w-48 rounded-[8px]" />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center">
                <span className="font-mono text-xs text-[#8185a0]">Generating QR Code...</span>
              </div>
            )}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-[4px] bg-[#0428cb] px-2 py-0.5 font-mono text-[9px] font-bold text-white shadow-md">
              SCAN WITH PHONE CAMERA
            </div>
          </div>

          <div className="mt-5 flex w-full items-center justify-between rounded-[8px] border border-[#131e5c] bg-[#02093a] p-2.5">
            <span className="font-mono text-xs text-[#34fcff] truncate max-w-[260px]">
              {mobileUrl}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-[6px] bg-[#0428cb] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#0428cb]/80"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2 rounded-[8px] border border-[#131e5c] bg-[#02093a]/50 p-3.5 font-mono text-xs text-[#afb4db]">
          <div className="flex items-center gap-2 text-white">
            <Wifi className="h-3.5 w-3.5 text-[#10b981]" />
            <span>Connect phone to the same Wi-Fi network</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <Radio className="h-3.5 w-3.5 text-[#34fcff]" />
            <span>Open camera, scan QR code, or paste the link</span>
          </div>
          <div className="flex items-center gap-2 text-[#8185a0]">
            <span>💡 Tap "Add to Home Screen" in browser to install full PWA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
