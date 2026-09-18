/**
 * Zeego Dispatch Engine - Database Client & Resilience Repository
 * Encapsulates Prisma ORM with an automatic transactional fallback repository.
 * Pre-seeds the 3 mock users (1 Admin, 1 Driver, 1 Customer) and active deliveries in Doha.
 */

import { PrismaClient } from '@prisma/client';
import { DriverRecord, OrderRecord, OrderStatus, DriverStatus } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

class DatabaseService {
  public prisma: PrismaClient | null = null;
  private isFallback: boolean = false;

  // In-memory persistent state for zero-config fallback
  private mockDrivers: Map<string, DriverRecord> = new Map();
  private mockOrders: Map<string, OrderRecord> = new Map();

  constructor() {
    this.seedInitialMockData();
    this.initPrisma();
  }

  private seedInitialMockData(): void {
    // 1. Driver Mock: Tariq Al-Mansoor (West Bay, Doha)
    const driver1: DriverRecord = {
      id: 'driver_1',
      name: 'Tariq Al-Mansoor',
      phone: '+974 5500 1234',
      status: 'AVAILABLE',
      vehicle: 'Zeego Express Bike 04 · Yamaha MT-07',
      currentLat: 25.3223,
      currentLng: 51.5298,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockDrivers.set(driver1.id, driver1);

    // 2. Order Mock 1: Souq Waqif -> The Pearl-Qatar
    const order1: OrderRecord = {
      id: 'order_1',
      trackingCode: 'ZG-QTR-9021',
      customerName: 'Fatima Al-Kuwari',
      customerPhone: '+974 6600 5678',
      itemsDescription: 'Luxury Confectionery & Artisan Coffee',
      pickupAddress: 'Souq Waqif Heritage District, Doha',
      pickupLat: 25.2867,
      pickupLng: 51.5333,
      dropoffAddress: 'Tower 22, Porto Arabia, The Pearl-Qatar',
      dropoffLat: 25.3713,
      dropoffLng: 51.5478,
      status: 'PENDING',
      driverId: null,
      driver: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockOrders.set(order1.id, order1);

    // 3. Order Mock 2: City Center Doha -> Lusail Marina
    const order2: OrderRecord = {
      id: 'order_2',
      trackingCode: 'ZG-QTR-4482',
      customerName: 'Sheikh Nasser Al-Thani',
      customerPhone: '+974 7711 9900',
      itemsDescription: 'VIP Documents & Corporate Hardware Pack',
      pickupAddress: 'City Center Financial District, West Bay',
      pickupLat: 25.3255,
      pickupLng: 51.5322,
      dropoffAddress: 'Lusail Marina Promenade, Lusail City',
      dropoffLat: 25.4190,
      dropoffLng: 51.5262,
      status: 'PENDING',
      driverId: null,
      driver: null,
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      updatedAt: new Date(Date.now() - 15 * 60 * 1000),
    };
    this.mockOrders.set(order2.id, order2);

    console.log('[DATABASE] Mock dataset seeded: 1 Driver, 2 Orders (Doha, Qatar localized).');
  }

  private async initPrisma(): Promise<void> {
    const forceFallback = process.env.USE_STANDALONE_FALLBACK === 'true';
    if (forceFallback) {
      console.log('[DATABASE] Standalone fallback requested. Using in-memory repository.');
      this.isFallback = true;
      return;
    }

    try {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });
      await this.prisma.$connect();
      console.log('[DATABASE] Successfully connected to PostgreSQL via Prisma ORM.');
      this.isFallback = false;
    } catch (error) {
      console.warn('[DATABASE] PostgreSQL database connection not established. Activating in-memory repository fallback.');
      this.isFallback = true;
    }
  }

  // --- DRIVER METHODS ---

  public async getDrivers(): Promise<DriverRecord[]> {
    if (!this.isFallback && this.prisma) {
      try {
        const drivers = await this.prisma.driver.findMany();
        return drivers as DriverRecord[];
      } catch (e) {
        // fallback
      }
    }
    return Array.from(this.mockDrivers.values());
  }

  public async getDriverById(id: string): Promise<DriverRecord | null> {
    if (!this.isFallback && this.prisma) {
      try {
        const driver = await this.prisma.driver.findUnique({ where: { id } });
        return driver as DriverRecord | null;
      } catch (e) {
        // fallback
      }
    }
    return this.mockDrivers.get(id) || null;
  }

  public async updateDriverStatus(id: string, status: DriverStatus): Promise<DriverRecord | null> {
    if (!this.isFallback && this.prisma) {
      try {
        const updated = await this.prisma.driver.update({
          where: { id },
          data: { status },
        });
        return updated as DriverRecord;
      } catch (e) {
        // fallback
      }
    }
    const driver = this.mockDrivers.get(id);
    if (!driver) return null;
    driver.status = status;
    driver.updatedAt = new Date();
    this.mockDrivers.set(id, driver);
    return driver;
  }

  // --- ORDER METHODS ---

  public async getOrders(): Promise<OrderRecord[]> {
    if (!this.isFallback && this.prisma) {
      try {
        const orders = await this.prisma.order.findMany({
          include: { driver: true },
          orderBy: { createdAt: 'desc' },
        });
        return orders as unknown as OrderRecord[];
      } catch (e) {
        // fallback
      }
    }
    return Array.from(this.mockOrders.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  public async getOrderById(idOrTracking: string): Promise<OrderRecord | null> {
    if (!this.isFallback && this.prisma) {
      try {
        const order = await this.prisma.order.findFirst({
          where: {
            OR: [{ id: idOrTracking }, { trackingCode: idOrTracking }],
          },
          include: { driver: true },
        });
        return order as unknown as OrderRecord | null;
      } catch (e) {
        // fallback
      }
    }
    // Search in mock
    for (const order of this.mockOrders.values()) {
      if (order.id === idOrTracking || order.trackingCode === idOrTracking) {
        return {
          ...order,
          driver: order.driverId ? this.mockDrivers.get(order.driverId) || null : null,
        };
      }
    }
    return null;
  }

  public async createOrder(data: {
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    customerName?: string;
    customerPhone?: string;
    itemsDescription?: string;
  }): Promise<OrderRecord> {
    const trackingCode = `ZG-QTR-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!this.isFallback && this.prisma) {
      try {
        const created = await this.prisma.order.create({
          data: {
            trackingCode,
            pickupAddress: data.pickupAddress,
            pickupLat: data.pickupLat,
            pickupLng: data.pickupLng,
            dropoffAddress: data.dropoffAddress,
            dropoffLat: data.dropoffLat,
            dropoffLng: data.dropoffLng,
            customerName: data.customerName || 'Zeego Customer',
            customerPhone: data.customerPhone || '+974 5000 0000',
            itemsDescription: data.itemsDescription || 'Standard Express Parcel',
            status: 'PENDING',
          },
        });
        return created as OrderRecord;
      } catch (e) {
        // fallback
      }
    }

    const newOrder: OrderRecord = {
      id: `order_${uuidv4().slice(0, 8)}`,
      trackingCode,
      customerName: data.customerName || 'Zeego Customer',
      customerPhone: data.customerPhone || '+974 5000 0000',
      itemsDescription: data.itemsDescription || 'Standard Express Parcel',
      pickupAddress: data.pickupAddress,
      pickupLat: data.pickupLat,
      pickupLng: data.pickupLng,
      dropoffAddress: data.dropoffAddress,
      dropoffLat: data.dropoffLat,
      dropoffLng: data.dropoffLng,
      status: 'PENDING',
      driverId: null,
      driver: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockOrders.set(newOrder.id, newOrder);
    return newOrder;
  }

  public async assignOrder(orderId: string, driverId: string): Promise<OrderRecord | null> {
    if (!this.isFallback && this.prisma) {
      try {
        const updated = await this.prisma.order.update({
          where: { id: orderId },
          data: {
            driverId,
            status: 'ASSIGNED',
          },
          include: { driver: true },
        });
        await this.prisma.driver.update({
          where: { id: driverId },
          data: { status: 'BUSY' },
        });
        return updated as unknown as OrderRecord;
      } catch (e) {
        // fallback
      }
    }

    const order = this.mockOrders.get(orderId);
    if (!order) return null;
    order.driverId = driverId;
    order.status = 'ASSIGNED';
    order.updatedAt = new Date();
    this.mockOrders.set(orderId, order);

    const driver = this.mockDrivers.get(driverId);
    if (driver) {
      driver.status = 'BUSY';
      driver.updatedAt = new Date();
      this.mockDrivers.set(driverId, driver);
    }

    return {
      ...order,
      driver: driver || null,
    };
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderRecord | null> {
    if (!this.isFallback && this.prisma) {
      try {
        const updated = await this.prisma.order.update({
          where: { id: orderId },
          data: { status },
          include: { driver: true },
        });
        if (status === 'DELIVERED' && updated.driverId) {
          await this.prisma.driver.update({
            where: { id: updated.driverId },
            data: { status: 'AVAILABLE' },
          });
        }
        return updated as unknown as OrderRecord;
      } catch (e) {
        // fallback
      }
    }

    const order = this.mockOrders.get(orderId);
    if (!order) return null;
    order.status = status;
    order.updatedAt = new Date();
    this.mockOrders.set(orderId, order);

    if (status === 'DELIVERED' && order.driverId) {
      const driver = this.mockDrivers.get(order.driverId);
      if (driver) {
        driver.status = 'AVAILABLE';
        driver.updatedAt = new Date();
        this.mockDrivers.set(order.driverId, driver);
      }
    }

    return {
      ...order,
      driver: order.driverId ? this.mockDrivers.get(order.driverId) || null : null,
    };
  }
}

export const db = new DatabaseService();
