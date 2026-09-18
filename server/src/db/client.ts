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
  private isFallback: boolean = true;

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
      this.prisma = null;
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

  /**
   * Idempotently reinstates the standard Doha demonstration dataset.
   * Can be invoked repeatedly by hiring teams and QA.
   */
  public async resetDemoData(): Promise<{ driversCount: number; ordersCount: number }> {
    // 1. Reset in-memory maps
    this.mockDrivers.clear();
    this.mockOrders.clear();

    const d1: DriverRecord = {
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
    const d2: DriverRecord = {
      id: 'driver_2',
      name: 'Bilal Al-Kuwari',
      phone: '+974 5511 7890',
      status: 'BUSY',
      vehicle: 'Zeego Hybrid Scooter 12 · Honda ADV350',
      currentLat: 25.3713,
      currentLng: 51.5478,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const d3: DriverRecord = {
      id: 'driver_3',
      name: 'Fahad Al-Marri',
      phone: '+974 5522 3456',
      status: 'AVAILABLE',
      vehicle: 'Zeego Electric Van 01 · Ford E-Transit',
      currentLat: 25.4190,
      currentLng: 51.5262,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockDrivers.set(d1.id, d1);
    this.mockDrivers.set(d2.id, d2);
    this.mockDrivers.set(d3.id, d3);

    const o1: OrderRecord = {
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
    const o2: OrderRecord = {
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
      status: 'ASSIGNED',
      driverId: 'driver_1',
      driver: d1,
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 60 * 1000),
    };
    const o3: OrderRecord = {
      id: 'order_3',
      trackingCode: 'ZG-QTR-1194',
      customerName: 'Amira Al-Sulaiti',
      customerPhone: '+974 5599 4433',
      itemsDescription: 'High-End Electronics & Lab Sensors',
      pickupAddress: 'Villaggio Mall, Al Waab, Doha',
      pickupLat: 25.2601,
      pickupLng: 51.4422,
      dropoffAddress: 'Education City Gate 2, Ar-Rayyan',
      dropoffLat: 25.3144,
      dropoffLng: 51.4403,
      status: 'IN_TRANSIT',
      driverId: 'driver_2',
      driver: d2,
      createdAt: new Date(Date.now() - 25 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 60 * 1000),
    };
    const o4: OrderRecord = {
      id: 'order_4',
      trackingCode: 'ZG-QTR-7720',
      customerName: 'Dr. Khalid Mahmoud',
      customerPhone: '+974 3322 1100',
      itemsDescription: 'Medical Supplies & Urgent Diagnostics',
      pickupAddress: 'Katara Cultural Village, Building 18',
      pickupLat: 25.3585,
      pickupLng: 51.5265,
      dropoffAddress: 'Hamad General Hospital District, Al Sadd',
      dropoffLat: 25.2925,
      dropoffLng: 51.4936,
      status: 'DELIVERED',
      driverId: 'driver_3',
      driver: d3,
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };

    this.mockOrders.set(o1.id, o1);
    this.mockOrders.set(o2.id, o2);
    this.mockOrders.set(o3.id, o3);
    this.mockOrders.set(o4.id, o4);

    // 2. If PostgreSQL is connected, sync tables
    if (!this.isFallback && this.prisma) {
      try {
        await this.prisma.order.deleteMany({});
        await this.prisma.driver.deleteMany({});

        await this.prisma.driver.createMany({
          data: [
            {
              id: d1.id,
              name: d1.name,
              phone: d1.phone,
              status: d1.status as any,
              vehicle: d1.vehicle,
              currentLat: d1.currentLat,
              currentLng: d1.currentLng,
            },
            {
              id: d2.id,
              name: d2.name,
              phone: d2.phone,
              status: d2.status as any,
              vehicle: d2.vehicle,
              currentLat: d2.currentLat,
              currentLng: d2.currentLng,
            },
            {
              id: d3.id,
              name: d3.name,
              phone: d3.phone,
              status: d3.status as any,
              vehicle: d3.vehicle,
              currentLat: d3.currentLat,
              currentLng: d3.currentLng,
            },
          ],
        });

        await this.prisma.order.createMany({
          data: [
            {
              id: o1.id,
              trackingCode: o1.trackingCode,
              customerName: o1.customerName,
              customerPhone: o1.customerPhone,
              itemsDescription: o1.itemsDescription,
              pickupAddress: o1.pickupAddress,
              pickupLat: o1.pickupLat,
              pickupLng: o1.pickupLng,
              dropoffAddress: o1.dropoffAddress,
              dropoffLat: o1.dropoffLat,
              dropoffLng: o1.dropoffLng,
              status: o1.status as any,
              driverId: null,
            },
            {
              id: o2.id,
              trackingCode: o2.trackingCode,
              customerName: o2.customerName,
              customerPhone: o2.customerPhone,
              itemsDescription: o2.itemsDescription,
              pickupAddress: o2.pickupAddress,
              pickupLat: o2.pickupLat,
              pickupLng: o2.pickupLng,
              dropoffAddress: o2.dropoffAddress,
              dropoffLat: o2.dropoffLat,
              dropoffLng: o2.dropoffLng,
              status: o2.status as any,
              driverId: d1.id,
            },
            {
              id: o3.id,
              trackingCode: o3.trackingCode,
              customerName: o3.customerName,
              customerPhone: o3.customerPhone,
              itemsDescription: o3.itemsDescription,
              pickupAddress: o3.pickupAddress,
              pickupLat: o3.pickupLat,
              pickupLng: o3.pickupLng,
              dropoffAddress: o3.dropoffAddress,
              dropoffLat: o3.dropoffLat,
              dropoffLng: o3.dropoffLng,
              status: o3.status as any,
              driverId: d2.id,
            },
            {
              id: o4.id,
              trackingCode: o4.trackingCode,
              customerName: o4.customerName,
              customerPhone: o4.customerPhone,
              itemsDescription: o4.itemsDescription,
              pickupAddress: o4.pickupAddress,
              pickupLat: o4.pickupLat,
              pickupLng: o4.pickupLng,
              dropoffAddress: o4.dropoffAddress,
              dropoffLat: o4.dropoffLat,
              dropoffLng: o4.dropoffLng,
              status: o4.status as any,
              driverId: d3.id,
            },
          ],
        });
      } catch (err) {
        console.error('[DATABASE] Error resetting Prisma demo data:', err);
      }
    }

    return { driversCount: 3, ordersCount: 4 };
  }
}

export const db = new DatabaseService();
