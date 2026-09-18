import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Material You (Material Design 3) Tokens with dynamic CSS variables
        md: {
          surface: 'var(--md-surface)',
          'on-surface': 'var(--md-on-surface)',
          primary: 'var(--md-primary)',
          'on-primary': 'var(--md-on-primary)',
          'secondary-container': 'var(--md-secondary-container)',
          'on-secondary-container': 'var(--md-on-secondary-container)',
          tertiary: 'var(--md-tertiary)',
          'on-tertiary': 'var(--md-on-tertiary)',
          'tertiary-container': 'var(--md-tertiary-container)',
          'on-tertiary-container': 'var(--md-on-tertiary-container)',
          'surface-container': 'var(--md-surface-container)',
          'surface-low': 'var(--md-surface-low)',
          outline: 'var(--md-outline)',
          'on-surface-variant': 'var(--md-on-surface-variant)',
        },
        // Legacy fallbacks for compatibility
        'midnight-ink': '#00052e',
        'signal-blue': '#0428cb',
        'arc-cyan': '#34fcff',
        'halo-violet': '#afb4db',
        'status-success': '#10b981',
        'status-warning': '#f59e0b',
        'status-danger': '#ef4444',
      },
      fontFamily: {
        sans: ['Figtree', 'Manrope', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
        'lg': '24px',
        'xl': '28px',
        '2xl': '32px',
        '3xl': '48px',
      },
      transitionTimingFunction: {
        'md-emphasized': 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
