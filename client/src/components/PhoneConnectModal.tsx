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
      const host = window.location.hostname === 'localhost' ? '192.168.100.70' : window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const protocol = window.location.protocol;
      const url = `${protocol}//${host}${port}/rider`;
      setMobileUrl(url);

      QRCode.toDataURL(url, {
        width: 240,
        margin: 2,
        color: {
          dark: '#1C1B1F',
          light: '#FFFFFF',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-[28px] bg-md-surface-container p-6 shadow-xl border border-md-outline/15 text-md-on-surface">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-md-on-surface-var hover:bg-md-surface-variant/30 active:scale-95 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 border-b border-md-outline/15 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-md-secondary-container text-md-on-secondary-container">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-md-on-surface">Connect Mobile Phone</h3>
            <p className="text-xs text-md-on-surface-var">Test Live Rider Cockpit on Device</p>
          </div>
        </div>

        {/* QR Code Canvas */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative rounded-[20px] bg-white p-3 shadow-md border border-md-outline/15">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scan QR Code to open Rider App" className="h-48 w-48 rounded-[12px]" />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center">
                <span className="text-xs text-slate-500">Generating QR Code...</span>
              </div>
            )}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-md-primary px-3 py-0.5 text-[10px] font-bold text-md-on-primary shadow-sm tracking-wide">
              SCAN WITH PHONE
            </div>
          </div>

          <div className="mt-6 flex w-full items-center justify-between rounded-full bg-md-surface p-1.5 pl-4 border border-md-outline/15">
            <span className="font-mono text-xs text-md-on-surface truncate max-w-[240px]">
              {mobileUrl}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-full bg-md-primary px-4 py-1.5 text-xs font-medium text-md-on-primary hover:bg-md-primary/90 active:scale-95 transition-all shadow-sm"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2 rounded-[16px] bg-md-surface-low p-4 text-xs text-md-on-surface">
          <div className="flex items-center gap-2.5">
            <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Connect phone to the same Wi-Fi network</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Radio className="h-4 w-4 text-md-primary shrink-0" />
            <span>Open camera, scan QR code, or paste the link</span>
          </div>
          <div className="flex items-center gap-2.5 text-md-on-surface-var pt-1 border-t border-md-outline/10">
            <span>💡 Tap &quot;Add to Home Screen&quot; in mobile browser for full PWA mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}
