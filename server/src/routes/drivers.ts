/**
 * Zeego Dispatch Engine - Drivers REST Controller
 * Provides driver roster and direct Redis telemetry lookups.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { telemetryCache } from '../redis/client.js';

export function createDriversRouter(): Router {
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

  return router;
}
