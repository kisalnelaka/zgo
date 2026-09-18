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
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center bg-md-surface px-4 py-12 text-md-on-surface overflow-hidden transition-colors duration-300">
      {/* Material You Atmospheric Blur Backgrounds */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-md-primary/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-md-tertiary/15 blur-3xl" aria-hidden="true" />

      <div className="relative w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-md-primary font-bold text-md-on-primary text-sm shadow-md">
            ZG
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-md-on-surface">
            Sign in to Zeego Pulse
          </h1>
          <p className="mt-1 text-xs text-md-on-surface-variant font-normal">
            Role-Based Access Control · Last-Mile Dispatch Engine
          </p>
        </div>

        {/* Material You Auth Surface Card */}
        <div className="rounded-[28px] bg-md-surface-container p-7 sm:p-8 shadow-sm border border-md-outline/10">
          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-md-on-surface-variant mb-2.5">
                Select Portal Account
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole('ADMIN')}
                  className={`flex flex-col items-center justify-center rounded-2xl p-3 text-center transition-all duration-300 active:scale-95 ${
                    selectedRole === 'ADMIN'
                      ? 'bg-md-secondary-container text-md-on-secondary-container font-semibold shadow-sm border border-md-primary/40'
                      : 'bg-md-surface-low text-md-on-surface-variant hover:bg-md-surface border border-transparent'
                  }`}
                >
                  <Shield className="h-5 w-5 mb-1.5 text-md-primary" />
                  <span className="text-xs">Dispatcher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('DRIVER')}
                  className={`flex flex-col items-center justify-center rounded-2xl p-3 text-center transition-all duration-300 active:scale-95 ${
                    selectedRole === 'DRIVER'
                      ? 'bg-md-secondary-container text-md-on-secondary-container font-semibold shadow-sm border border-md-primary/40'
                      : 'bg-md-surface-low text-md-on-surface-variant hover:bg-md-surface border border-transparent'
                  }`}
                >
                  <Truck className="h-5 w-5 mb-1.5 text-md-tertiary" />
                  <span className="text-xs">Rider</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('CUSTOMER')}
                  className={`flex flex-col items-center justify-center rounded-2xl p-3 text-center transition-all duration-300 active:scale-95 ${
                    selectedRole === 'CUSTOMER'
                      ? 'bg-md-secondary-container text-md-on-secondary-container font-semibold shadow-sm border border-md-primary/40'
                      : 'bg-md-surface-low text-md-on-surface-variant hover:bg-md-surface border border-transparent'
                  }`}
                >
                  <User className="h-5 w-5 mb-1.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Customer</span>
                </button>
              </div>
            </div>

            {/* Material 3 Filled Text Fields */}
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-md-on-surface-variant mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    readOnly
                    value={PRESET_USERS[selectedRole].email}
                    className="block w-full h-12 rounded-t-xl rounded-b-none border-b-2 border-md-outline/40 focus:border-md-primary bg-md-surface-low px-4 text-xs font-mono text-md-on-surface outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-md-on-surface-variant mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    readOnly
                    value="••••••••••••"
                    className="block w-full h-12 rounded-t-xl rounded-b-none border-b-2 border-md-outline/40 focus:border-md-primary bg-md-surface-low px-4 text-xs text-md-on-surface outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-md-primary py-3 text-xs font-medium text-md-on-primary shadow-sm hover:shadow-md hover:bg-md-primary/90 transition-all duration-300 active:scale-95"
            >
              <span>Continue as {PRESET_USERS[selectedRole].name}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="mt-6 rounded-2xl bg-md-surface-low p-4 text-xs text-md-on-surface-variant border border-md-outline/10">
            <div className="flex items-center gap-2 font-medium text-md-on-surface">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>1-Click Live Role Switching</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-md-on-surface-variant">
              No manual credentials needed. Selecting <strong>Dispatcher</strong> enters the Admin Command Center, <strong>Rider</strong> opens the Mobile Cockpit, and <strong>Customer</strong> launches live parcel tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
