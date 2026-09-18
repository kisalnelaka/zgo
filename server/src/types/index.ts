/**
 * Zeego Last-Mile Dispatch Engine - Core System Types
 * Strict domain typing across Database, Redis, and WebSocket transport layers.
 */

export type OrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';

export type DriverStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface LocationTelemetry {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: number;
}

export interface DriverRecord {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  vehicle: string;
  currentLat: number;
  currentLng: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRecord {
  id: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  itemsDescription: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  status: OrderStatus;
  driverId?: string | null;
  driver?: DriverRecord | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationUpdatePayload extends LocationTelemetry {
  orderId?: string;
  driverName?: string;
  status?: OrderStatus;
}

export interface StatusChangePayload {
  orderId: string;
  driverId: string;
  status: OrderStatus;
}

export interface OrderDispatchPayload {
  order: OrderRecord;
  driverId: string;
}
