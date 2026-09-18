import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { telemetryCache } from '../redis/client.js';
import { SocketServer } from '../socket/index.js';
import { z } from 'zod';

const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  accuracy: z.number().optional(),
});

export function createDriversRouter(socketServer?: SocketServer): Router {
  const router = Router();

  /**
   * GET /api/drivers
   * List all registered drivers with their active status and latest cached GPS from Redis.
   */
  router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
      const drivers = await db.getDrivers();
      const driverIds = drivers.map((d) => d.id);
      const locations = await telemetryCache.getAllDriverLocations(driverIds);

      const enriched = drivers.map((d) => ({
        ...d,
        liveTelemetry: locations[d.id] || {
          driverId: d.id,
          lat: d.currentLat,
          lng: d.currentLng,
          heading: 0,
          speed: 0,
          timestamp: Date.now(),
        },
      }));

      res.json({ success: true, data: enriched });
    } catch (error) {
      console.error('[API] Error fetching drivers:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /api/drivers/:id/location
   * Fast Redis lookup for a single driver's live GPS telemetry.
   */
  router.get('/:id/location', async (req: Request, res: Response): Promise<void> => {
    try {
      const driverId = String(req.params.id);
      const telemetry = await telemetryCache.getDriverLocation(driverId);
      if (!telemetry) {
        // Fallback to initial DB coordinates
        const driver = await db.getDriverById(driverId);
        if (!driver) {
          res.status(404).json({ success: false, error: 'Driver not found' });
          return;
        }
        res.json({
          success: true,
          data: {
            driverId: driver.id,
            lat: driver.currentLat,
            lng: driver.currentLng,
            heading: 0,
            speed: 0,
            timestamp: Date.now(),
          },
        });
        return;
      }

      res.json({ success: true, data: telemetry });
    } catch (error) {
      console.error('[API] Error fetching driver telemetry:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * POST /api/drivers/:id/location
   * High-frequency telemetry ingest updating Redis cache and broadcasting over WebSockets.
   */
  router.post('/:id/location', async (req: Request, res: Response): Promise<void> => {
    try {
      const driverId = String(req.params.id);
      const parsed = updateLocationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid coordinate payload', details: parsed.error.issues });
        return;
      }

      const telemetry = {
        driverId,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        heading: parsed.data.heading || 0,
        speed: parsed.data.speed || 0,
        accuracy: parsed.data.accuracy || 5,
        timestamp: Date.now(),
      };

      await telemetryCache.updateDriverLocation(telemetry);

      if (socketServer) {
        socketServer.getIO().to('admin').emit('location_update', telemetry);
      }

      res.json({ success: true, data: telemetry });
    } catch (error) {
      console.error('[API] Error updating driver location:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}
