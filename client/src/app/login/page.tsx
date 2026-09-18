'use client';

import React, { useState } from 'react';
import { useAuth, PRESET_USERS, UserRole } from '@/lib/auth';
import { Shield, Truck, User, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedRole);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20">
            ZG
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Sign in to Zeego
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Role-Based Access Control · Last-Mile Dispatch Engine
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Select Portal Account
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('ADMIN')}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                    selectedRole === 'ADMIN'
                      ? 'border-blue-500 bg-blue-600/10 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Shield className="h-5 w-5 mb-1 text-blue-400" />
                  <span className="text-xs font-medium">Dispatcher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('DRIVER')}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                    selectedRole === 'DRIVER'
                      ? 'border-blue-500 bg-blue-600/10 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Truck className="h-5 w-5 mb-1 text-sky-400" />
                  <span className="text-xs font-medium">Rider</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('CUSTOMER')}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                    selectedRole === 'CUSTOMER'
                      ? 'border-blue-500 bg-blue-600/10 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <User className="h-5 w-5 mb-1 text-emerald-400" />
                  <span className="text-xs font-medium">Customer</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  readOnly
                  value={PRESET_USERS[selectedRole].email}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  readOnly
                  value="••••••••••••"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-[0.98]"
            >
              <span>Continue as {PRESET_USERS[selectedRole].name}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="mt-5 rounded-lg border border-slate-800/80 bg-slate-950/50 p-3 text-xs text-slate-400">
            <div className="flex items-center gap-2 font-medium text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Pre-configured Portfolio Accounts</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Each profile gives you direct access to that role's interface: Dispatcher leads to Admin Analytics &amp; Map, Rider opens the Mobile PWA, and Customer views live parcel tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
