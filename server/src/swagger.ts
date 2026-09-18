/**
 * Zeego Last-Mile Dispatch Engine - OpenAPI 3.0 Swagger Specification
 * Provides interactive API documentation at /api/docs.
 */

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Zeego Last-Mile Real-Time Dispatch API',
    version: '1.0.0',
    description: `
**Zeego Delivery (Qatar)** — Real-Time Last-Mile Dispatch & Fleet Telemetry Engine.

### Architectural Highlights
- **Isolating Database from Sensor Noise:** High-frequency GPS pings are cached in Redis (\`driver:{id}:location\`) with rolling TTL.
- **WebSocket Synchronization:** Low-latency room multiplexing via Socket.io (\`admin\`, \`driver:{id}\`, \`order:{id}\`).
- **ACID Transaction Isolation:** PostgreSQL persistence reserved exclusively for order state transitions (\`PENDING\` -> \`ASSIGNED\` -> \`IN_TRANSIT\` -> \`DELIVERED\`).
    `,
    contact: {
      name: 'Kisal Nelaka · Web & Application Developer',
      url: 'https://zeego.loghorizon.online',
      email: 'kisalnelaka@gmail.com',
    },
    license: {
      name: 'Evaluation & Demonstration License (Non-Commercial)',
      url: 'https://zeego.loghorizon.online',
    },
  },
  servers: [
    {
      url: 'https://zeego.loghorizon.online',
      description: 'Production VPS Server (Doha / Global)',
    },
    {
      url: 'http://localhost:4000',
      description: 'Local Development Server',
    },
  ],
  tags: [
    { name: 'Health', description: 'System health & telemetry engine diagnostic' },
    { name: 'Orders', description: 'Lifecycle management for parcel orders & dispatch' },
    { name: 'Drivers', description: 'Courier roster and live telemetry caching' },
    { name: 'Demo', description: 'Instant demo reset and test data reinstatement' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'System health diagnostic',
        description: 'Returns real-time status of Express server, Redis connection mode, and server uptime.',
        responses: {
          200: {
            description: 'System is operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'HEALTHY' },
                    service: { type: 'string', example: 'Zeego Last-Mile Dispatch Engine' },
                    location: { type: 'string', example: 'Doha, Qatar' },
                    redisMode: { type: 'string', example: 'LIVE_REDIS' },
                    uptimeSeconds: { type: 'number', example: 1420 },
                    timestamp: { type: 'string', example: '2026-09-18T10:00:00.000Z' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List all dispatch orders',
        description: 'Retrieves all orders in the system ordered by creation date, including assigned driver details.',
        responses: {
          200: {
            description: 'Array of orders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Order' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Orders'],
        summary: 'Ingest new delivery request',
        description: 'Creates a new order, stores in PostgreSQL, emits real-time WebSocket event to admin room, and optionally dispatches to driver.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateOrderInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Order created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error' },
        },
      },
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order details with live telemetry',
        description: 'Retrieves order metadata and enriches it with real-time GPS coordinates directly from Redis if a driver is assigned.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Order UUID or Tracking Code (e.g., ZG-QTR-9021)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Order details with enriched live telemetry',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      allOf: [
                        { $ref: '#/components/schemas/Order' },
                        {
                          type: 'object',
                          properties: {
                            driverLiveLocation: { $ref: '#/components/schemas/DriverTelemetry' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          404: { description: 'Order not found' },
        },
      },
    },
    '/api/orders/{id}/assign': {
      post: {
        tags: ['Orders'],
        summary: 'Assign order to driver',
        description: 'Transitions order state to ASSIGNED, updates driver to BUSY, emits real-time socket offer to rider, and dispatches mock SMS.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Order UUID',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['driverId'],
                properties: {
                  driverId: { type: 'string', example: 'driver_1' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Order assigned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          404: { description: 'Order or driver not found' },
        },
      },
      patch: {
        tags: ['Orders'],
        summary: 'Assign order to driver (PATCH alias)',
        description: 'RESTful patch equivalent for courier assignment state transitions.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Order UUID',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['driverId'],
                properties: {
                  driverId: { type: 'string', example: 'driver_1' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Order assigned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          404: { description: 'Order or driver not found' },
        },
      },
    },
    '/api/drivers': {
      get: {
        tags: ['Drivers'],
        summary: 'List active couriers with live GPS',
        description: 'Returns all drivers with active status and batch-resolved real-time coordinates from Redis.',
        responses: {
          200: {
            description: 'Driver roster with telemetry',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Driver' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/drivers/{id}/location': {
      get: {
        tags: ['Drivers'],
        summary: 'Get driver live location from Redis',
        description: 'High-speed lookup returning latest cached GPS coordinates with sub-5ms latency.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Driver UUID or ID',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Driver location payload',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/DriverTelemetry' },
                  },
                },
              },
            },
          },
          404: { description: 'Driver not found' },
        },
      },
      post: {
        tags: ['Drivers'],
        summary: 'Ingest high-frequency driver GPS telemetry',
        description: 'Accepts real-time coordinates, heading, and speed, saves to Redis with rolling TTL, and broadcasts to admin map via WebSocket.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Driver UUID or ID',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lat', 'lng'],
                properties: {
                  lat: { type: 'number', example: 25.3223 },
                  lng: { type: 'number', example: 51.5298 },
                  heading: { type: 'number', example: 45 },
                  speed: { type: 'number', example: 35 },
                  accuracy: { type: 'number', example: 5 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Telemetry cached and broadcasted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/DriverTelemetry' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid coordinate payload' },
        },
      },
    },
    '/api/demo/reset': {
      post: {
        tags: ['Demo'],
        summary: 'Reinstate demo test dataset',
        description: 'Idempotently resets the database and telemetry cache with fresh Doha orders and active couriers across multiple lifecycle states.',
        responses: {
          200: {
            description: 'Demo dataset reinstated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Demo state reset successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        driversCount: { type: 'number', example: 3 },
                        ordersCount: { type: 'number', example: 4 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'order_1' },
          trackingCode: { type: 'string', example: 'ZG-QTR-9021' },
          customerName: { type: 'string', example: 'Fatima Al-Kuwari' },
          customerPhone: { type: 'string', example: '+974 6600 5678' },
          itemsDescription: { type: 'string', example: 'Luxury Confectionery & Artisan Coffee' },
          pickupAddress: { type: 'string', example: 'Souq Waqif Heritage District, Doha' },
          pickupLat: { type: 'number', example: 25.2867 },
          pickupLng: { type: 'number', example: 51.5333 },
          dropoffAddress: { type: 'string', example: 'Tower 22, Porto Arabia, The Pearl-Qatar' },
          dropoffLat: { type: 'number', example: 25.3713 },
          dropoffLng: { type: 'number', example: 51.5478 },
          status: { type: 'string', enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'], example: 'PENDING' },
          driverId: { type: 'string', nullable: true, example: null },
          createdAt: { type: 'string', example: '2026-09-18T08:00:00.000Z' },
          updatedAt: { type: 'string', example: '2026-09-18T08:00:00.000Z' },
        },
      },
      CreateOrderInput: {
        type: 'object',
        required: ['pickupAddress', 'pickupLat', 'pickupLng', 'dropoffAddress', 'dropoffLat', 'dropoffLng'],
        properties: {
          pickupAddress: { type: 'string', example: 'West Bay Financial District, Tower 4, Doha' },
          pickupLat: { type: 'number', example: 25.3218 },
          pickupLng: { type: 'number', example: 51.5312 },
          dropoffAddress: { type: 'string', example: 'The Pearl-Qatar, Porto Arabia Tower 12, Doha' },
          dropoffLat: { type: 'number', example: 25.3712 },
          dropoffLng: { type: 'number', example: 51.5492 },
          customerName: { type: 'string', example: 'Fatima Al-Kuwari' },
          customerPhone: { type: 'string', example: '+974 5512 3456' },
          itemsDescription: { type: 'string', example: 'Specialty Espresso Beans & Cold Brew' },
          driverId: { type: 'string', example: 'driver_1' },
        },
      },
      Driver: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'driver_1' },
          name: { type: 'string', example: 'Tariq Al-Mansoor' },
          phone: { type: 'string', example: '+974 5500 1234' },
          status: { type: 'string', enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], example: 'AVAILABLE' },
          vehicle: { type: 'string', example: 'Zeego Express Bike 04 · Yamaha MT-07' },
          currentLat: { type: 'number', example: 25.3223 },
          currentLng: { type: 'number', example: 51.5298 },
          liveTelemetry: { $ref: '#/components/schemas/DriverTelemetry' },
        },
      },
      DriverTelemetry: {
        type: 'object',
        properties: {
          driverId: { type: 'string', example: 'driver_1' },
          lat: { type: 'number', example: 25.3223 },
          lng: { type: 'number', example: 51.5298 },
          heading: { type: 'number', example: 45.0 },
          speed: { type: 'number', example: 38.5 },
          timestamp: { type: 'number', example: 1789718400000 },
        },
      },
    },
  },
};
