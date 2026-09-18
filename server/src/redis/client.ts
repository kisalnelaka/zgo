/**
 * Zeego Dispatch Engine - In-Memory Telemetry Cache Layer
 * Handles high-frequency GPS pings strictly in Redis to isolate Postgres from write-heavy telemetry.
 * Strategy: `driver:{id}:location` -> JSON string containing { lat, lng, heading, speed, timestamp }
 */

import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { LocationTelemetry } from '../types/index.js';

class TelemetryCache {
  private client: Redis;
  private isFallback: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const forceFallback = process.env.USE_STANDALONE_FALLBACK === 'true';

    if (forceFallback) {
      console.log('[REDIS] Standalone fallback enabled. Initializing high-speed in-memory store.');
      this.client = new RedisMock() as unknown as Redis;
      this.isFallback = true;
    } else {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 2) {
            console.warn('[REDIS] Live Redis daemon unreachable. Gracefully falling back to in-memory store.');
            this.activateFallback();
            return null; // Stop retrying
          }
          return Math.min(times * 200, 1000);
        },
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      this.client.connect().catch(() => {
        this.activateFallback();
      });

      this.client.on('connect', () => {
        console.log('[REDIS] Successfully connected to live Redis instance.');
        this.isFallback = false;
      });

      this.client.on('error', (err) => {
        if (!this.isFallback) {
          console.warn(`[REDIS] Connection notice: ${err.message}. Switching to in-memory store.`);
          this.activateFallback();
        }
      });
    }
  }

  private activateFallback(): void {
    if (this.isFallback) return;
    this.isFallback = true;
    this.client = new RedisMock() as unknown as Redis;
    console.log('[REDIS] In-memory Redis simulation active and ready.');
  }

  /**
   * Fast key-value write for high-frequency GPS pings.
   * Key pattern: `driver:${id}:location`
   * Key TTL: 86400 seconds (1 day rolling)
   */
  public async setDriverLocation(telemetry: LocationTelemetry): Promise<void> {
    const key = `driver:${telemetry.driverId}:location`;
    const payload = JSON.stringify({
      driverId: telemetry.driverId,
      lat: telemetry.lat,
      lng: telemetry.lng,
      heading: telemetry.heading ?? 0,
      speed: telemetry.speed ?? 0,
      accuracy: telemetry.accuracy ?? 5,
      timestamp: telemetry.timestamp || Date.now(),
    });

    try {
      await this.client.set(key, payload, 'EX', 86400);
    } catch (error) {
      console.error(`[REDIS] Error setting driver location for ${telemetry.driverId}:`, error);
    }
  }

  public async updateDriverLocation(telemetry: LocationTelemetry): Promise<void> {
    return this.setDriverLocation(telemetry);
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      // ignore
    }
  }

  /**
   * Retrieve latest cached location for a specific driver.
   */
  public async getDriverLocation(driverId: string): Promise<LocationTelemetry | null> {
    const key = `driver:${driverId}:location`;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as LocationTelemetry;
    } catch (error) {
      console.error(`[REDIS] Error fetching driver location for ${driverId}:`, error);
      return null;
    }
  }

  /**
   * Batch retrieve active telemetry for all drivers.
   */
  public async getAllDriverLocations(driverIds: string[]): Promise<Record<string, LocationTelemetry>> {
    if (driverIds.length === 0) return {};
    const results: Record<string, LocationTelemetry> = {};

    try {
      const keys = driverIds.map((id) => `driver:${id}:location`);
      const values = await this.client.mget(...keys);

      values.forEach((val, idx) => {
        if (val) {
          results[driverIds[idx]] = JSON.parse(val) as LocationTelemetry;
        }
      });
    } catch (error) {
      console.error('[REDIS] Error batch-fetching driver locations:', error);
    }

    return results;
  }

  public isUsingFallback(): boolean {
    return this.isFallback;
  }
}

export const telemetryCache = new TelemetryCache();
