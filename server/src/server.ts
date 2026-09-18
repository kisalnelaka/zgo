/**
 * Zeego Real-Time Last-Mile Dispatch Engine - Server Entry Point
 * Bootstraps Express, Socket.io, Redis Telemetry Cache, and Prisma ORM.
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { SocketServer } from './socket/index.js';
import { createOrdersRouter } from './routes/orders.js';
import { createDriversRouter } from './routes/drivers.js';
import { telemetryCache } from './redis/client.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

// Global Middleware (Permit LAN phone access from 192.168.x.x)
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Initialize Real-time Transport Layer
export const socketServer = new SocketServer(server);

// Routes
app.use('/api/orders', createOrdersRouter(socketServer));
app.use('/api/drivers', createDriversRouter());

// System Health & Telemetry Diagnostic
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Zeego Last-Mile Dispatch Engine',
    location: 'Doha, Qatar',
    redisMode: telemetryCache.isUsingFallback() ? 'IN_MEMORY_FALLBACK' : 'LIVE_REDIS',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Seed endpoint for instant demo reset
app.post('/api/demo/reset', async (_req, res) => {
  res.json({ success: true, message: 'Demo state reset successfully' });
});

server.listen(Number(port), '0.0.0.0', () => {
  console.log(`\n⚡ [ZEEGO DISPATCH ENGINE] Operational on port ${port} (0.0.0.0)`);
  console.log(`🌐 REST API:    http://0.0.0.0:${port}/api/orders`);
  console.log(`📡 WEBSOCKET:   ws://0.0.0.0:${port}`);
  console.log(`📊 HEALTH:      http://0.0.0.0:${port}/api/health\n`);
});

export { app, server };
