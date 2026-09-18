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
        'midnight-ink': '#00052e',
        'signal-blue': '#0428cb',
        'arc-cyan': '#34fcff',
        'halo-violet': '#afb4db',
        'carbon': '#222222',
        'slate-body': '#4f5166',
        'fog': '#6b6b83',
        'mist': '#8185a0',
        'silver-border': '#dbdcdf',
        'paper': '#ffffff',
        'panel-dark': '#02093a',
        'panel-border': '#131e5c',
        'status-success': '#10b981',
        'status-warning': '#f59e0b',
        'status-danger': '#ef4444',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'tag': '4px',
        'card': '8px',
        'button': '8px',
      },
      boxShadow: {
        'cyan-glow': '0 0 15px -3px rgba(52, 252, 255, 0.3)',
        'blue-glow': '0 0 20px -4px rgba(4, 40, 203, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
