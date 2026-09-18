export type OrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';
export type DriverStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  vehicle: string;
  currentLat: number;
  currentLng: number;
  liveTelemetry?: {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    timestamp: number;
  };
}

export interface Order {
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
  driver?: Driver | null;
  driverLiveLocation?: {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    timestamp: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    // If running on custom domain (e.g. zeego.loghorizon.online), reverse proxy routes /api/ directly to backend
    if (window.location.port === '' || window.location.port === '80' || window.location.port === '443') {
      return '';
    }
    // Local dev fallback (e.g. localhost:3000 -> localhost:4000)
    const host = window.location.hostname || 'localhost';
    return `${window.location.protocol}//${host}:4000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${getApiBase()}/api/orders`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch orders');
  const json = await res.json();
  return json.data || [];
}

export async function fetchOrderById(idOrTracking: string): Promise<Order> {
  const res = await fetch(`${getApiBase()}/api/orders/${idOrTracking}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch order');
  const json = await res.json();
  return json.data;
}

export async function fetchDrivers(): Promise<Driver[]> {
  const res = await fetch(`${getApiBase()}/api/drivers`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch drivers');
  const json = await res.json();
  return json.data || [];
}

export async function createOrder(data: {
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  customerName?: string;
  customerPhone?: string;
  itemsDescription?: string;
  driverId?: string;
}): Promise<Order> {
  const res = await fetch(`${getApiBase()}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create order' }));
    throw new Error(err.error || 'Failed to create order');
  }
  const json = await res.json();
  return json.data;
}

export async function assignOrder(orderId: string, driverId: string): Promise<Order> {
  const res = await fetch(`${getApiBase()}/api/orders/${orderId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId }),
  });
  if (!res.ok) throw new Error('Failed to assign order');
  const json = await res.json();
  return json.data;
}
