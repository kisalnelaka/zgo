import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Zeego Pulse · Real-Time Last-Mile Dispatch Engine',
  description: 'Mission-critical real-time logistics engine with high-frequency GPS streaming, Redis caching, and WebSocket transport for Zeego Delivery (Qatar).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#00052e] text-[#ffffff] antialiased selection:bg-[#0428cb] selection:text-[#34fcff]">
        <Navigation />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </body>
    </html>
  );
}
