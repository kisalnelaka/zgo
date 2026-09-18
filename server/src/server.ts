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
import { db } from './db/client.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

// Global Middleware (Permit LAN phone access from 192.168.x.x and Cloudflare origin)
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Initialize Real-time Transport Layer
export const socketServer = new SocketServer(server);

// Swagger Interactive Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Zeego Last-Mile Dispatch Engine · API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api/orders', createOrdersRouter(socketServer));
app.use('/api/drivers', createDriversRouter(socketServer));

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
  try {
    const stats = await db.resetDemoData();
    // Cache fresh driver locations in Redis
    const now = Date.now();
    await telemetryCache.updateDriverLocation({
      driverId: 'driver_1',
      lat: 25.3223,
      lng: 51.5298,
      heading: 45,
      speed: 35,
      timestamp: now,
    });
    await telemetryCache.updateDriverLocation({
      driverId: 'driver_2',
      lat: 25.3713,
      lng: 51.5478,
      heading: 120,
      speed: 42,
      timestamp: now,
    });
    await telemetryCache.updateDriverLocation({
      driverId: 'driver_3',
      lat: 25.4190,
      lng: 51.5262,
      heading: 270,
      speed: 0,
      timestamp: now,
    });

    res.json({
      success: true,
      message: 'Demo state and Doha telemetry reset successfully',
      data: stats,
    });
  } catch (error) {
    console.error('[API] Error resetting demo state:', error);
    res.status(500).json({ success: false, error: 'Failed to reset demo dataset' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(Number(port), '0.0.0.0', () => {
    console.log(`\n⚡ [ZEEGO DISPATCH ENGINE] Operational on port ${port} (0.0.0.0)`);
    console.log(`📖 API DOCS:    http://0.0.0.0:${port}/api/docs`);
    console.log(`🌐 REST API:    http://0.0.0.0:${port}/api/orders`);
    console.log(`📡 WEBSOCKET:   ws://0.0.0.0:${port}`);
    console.log(`📊 HEALTH:      http://0.0.0.0:${port}/api/health\n`);
  });
}

export { app, server };
