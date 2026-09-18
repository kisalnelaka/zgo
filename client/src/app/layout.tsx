import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Zeego Delivery · Real-Time Last-Mile Dispatch Engine',
  description: 'Enterprise last-mile delivery engine with live GPS telemetry, Redis caching, and WebSocket synchronization for Zeego Delivery (Qatar).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          <Navigation />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
