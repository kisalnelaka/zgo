/**
 * Zeego Last-Mile Dispatch Engine - Backend Test Suite
 * Validates Health Diagnostics, Orders Ingestion, Telemetry Cache, and Error Boundaries.
 */

import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db/client.js';
import { telemetryCache } from '../redis/client.js';

describe('Zeego Last-Mile Dispatch Engine Core API', () => {
  beforeAll(async () => {
    // Reset to baseline demo state
    await db.resetDemoData();
  });

  afterAll(async () => {
    await telemetryCache.disconnect();
  });

  describe('Health Diagnostic API', () => {
    it('should return HEALTHY with location Doha, Qatar', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.location).toBe('Doha, Qatar');
      expect(res.body.service).toContain('Zeego');
      expect(res.body).toHaveProperty('redisMode');
    });

    it('should serve Swagger OpenAPI schema at /api/docs.json', async () => {
      const res = await request(app).get('/api/docs.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info.title).toContain('Zeego');
      expect(res.body.paths).toHaveProperty('/api/orders');
    });
  });

  describe('Orders API', () => {
    it('GET /api/orders should return the seeded Doha orders', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('POST /api/orders should validate required coordinates and address fields', async () => {
      const res = await request(app).post('/api/orders').send({
        customerName: 'Test Incomplete Order',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('POST /api/orders should ingest valid order and return tracking code', async () => {
      const res = await request(app).post('/api/orders').send({
        customerName: 'Sheikh Tamim',
        customerPhone: '+974 5500 9988',
        itemsDescription: 'Diplomatic Documents',
        pickupAddress: 'Amiri Diwan, Doha',
        pickupLat: 25.2917,
        pickupLng: 51.5369,
        dropoffAddress: 'Hamad International Airport VIP Terminal',
        dropoffLat: 25.2731,
        dropoffLng: 51.6081,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trackingCode).toMatch(/^ZG-QTR-\d{4}$/);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('GET /api/orders/:id should retrieve created order and enrich with telemetry', async () => {
      // Fetch order_1 (seeded)
      const res = await request(app).get('/api/orders/order_1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('order_1');
      expect(res.body.data).toHaveProperty('driverLiveLocation');
    });

    it('PATCH /api/orders/:id/assign should assign driver and return updated state', async () => {
      const res = await request(app)
        .patch('/api/orders/order_2/assign')
        .send({ driverId: 'driver_2' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ASSIGNED');
      expect(res.body.data.driverId).toBe('driver_2');
    });

    it('PATCH /api/orders/:id/status should update delivery lifecycle to IN_TRANSIT and DELIVERED', async () => {
      // Transition to IN_TRANSIT
      const inTransitRes = await request(app)
        .patch('/api/orders/order_2/status')
        .send({ status: 'IN_TRANSIT' });
      expect(inTransitRes.status).toBe(200);
      expect(inTransitRes.body.success).toBe(true);
      expect(inTransitRes.body.data.status).toBe('IN_TRANSIT');

      // Transition to DELIVERED
      const deliveredRes = await request(app)
        .patch('/api/orders/order_2/status')
        .send({ status: 'DELIVERED' });
      expect(deliveredRes.status).toBe(200);
      expect(deliveredRes.body.success).toBe(true);
      expect(deliveredRes.body.data.status).toBe('DELIVERED');
    });

    it('PATCH /api/orders/:id/status should reject invalid status string', async () => {
      const res = await request(app)
        .patch('/api/orders/order_2/status')
        .send({ status: 'INVALID_STATUS' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid status');
    });
  });

  describe('Drivers & Redis Telemetry Cache', () => {
    it('GET /api/drivers should return courier roster with current status', async () => {
      const res = await request(app).get('/api/drivers');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const tariq = res.body.data.find((d: any) => d.id === 'driver_1');
      expect(tariq).toBeDefined();
      expect(tariq.name).toBe('Tariq Al-Mansoor');
      expect(tariq).toHaveProperty('liveTelemetry');
    });

    it('POST /api/drivers/:id/location should ingest high-frequency telemetry into Redis', async () => {
      const res = await request(app)
        .post('/api/drivers/driver_1/location')
        .send({
          lat: 25.3223,
          lng: 51.5298,
          heading: 65,
          speed: 48,
          accuracy: 4,
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.driverId).toBe('driver_1');
      expect(res.body.data.speed).toBe(48);
    });

    it('GET /api/drivers/:id/location should retrieve cached telemetry from Redis', async () => {
      const res = await request(app).get('/api/drivers/driver_1/location');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.driverId).toBe('driver_1');
      expect(res.body.data.lat).toBe(25.3223);
      expect(res.body.data.lng).toBe(51.5298);
    });

    it('telemetryCache should store and retrieve high-frequency GPS pings with heading and speed', async () => {
      await telemetryCache.updateDriverLocation({
        driverId: 'driver_test',
        lat: 25.3218,
        lng: 51.5312,
        heading: 90,
        speed: 45.2,
        timestamp: Date.now(),
      });

      const loc = await telemetryCache.getDriverLocation('driver_test');
      expect(loc).toBeDefined();
      expect(loc?.lat).toBe(25.3218);
      expect(loc?.lng).toBe(51.5312);
      expect(loc?.heading).toBe(90);
      expect(loc?.speed).toBe(45.2);
    });
  });

  describe('Demo Reset Endpoint', () => {
    it('POST /api/demo/reset should reinstate all drivers and orders', async () => {
      const res = await request(app).post('/api/demo/reset');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.driversCount).toBe(3);
      expect(res.body.data.ordersCount).toBe(4);
    });
  });
});
