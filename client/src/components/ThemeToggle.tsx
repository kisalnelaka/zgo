'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      className={`relative inline-flex items-center justify-center h-10 px-3.5 rounded-full bg-md-surface-container hover:bg-md-secondary-container text-md-on-surface transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md border border-md-outline/20 group ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
        {theme === 'dark' ? (
          <>
            <svg
              className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span className="hidden sm:inline">Light</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4 text-md-primary transition-transform duration-300 group-hover:-rotate-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
            <span className="hidden sm:inline">Dark</span>
          </>
        )}
      </div>
    </button>
  );
}
