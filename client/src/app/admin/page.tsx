'use client';

import React, { useEffect, useState } from 'react';
import { MapboxMap } from '@/components/MapboxMap';
import { getSocket } from '@/lib/socket';
import { fetchOrders, fetchDrivers, assignOrder, createOrder, Order, Driver } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  MapPin,
  Truck,
  Package,
  Clock,
  Send,
  Plus,
  Search,
  Filter,
  BarChart3,
  List,
  Compass,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  Smartphone,
  ChevronRight,
  X,
  RotateCcw,
} from 'lucide-react';

interface TelemetryPing {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'map' | 'orders' | 'analytics' | 'fleet'>('map');
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverLocations, setDriverLocations] = useState<Record<string, TelemetryPing>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // New Order Form state
  const [newPickupAddress, setNewPickupAddress] = useState('Souq Waqif Logistics Hub');
  const [newDropoffAddress, setNewDropoffAddress] = useState('Tower 18, Porto Arabia, The Pearl-Qatar');
  const [newCustomerName, setNewCustomerName] = useState('Hamad Al-Thani');
  const [newCustomerPhone, setNewCustomerPhone] = useState('+974 5588 9911');
  const [newItemsDesc, setNewItemsDesc] = useState('Express Documents & Food Basket');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [ordersData, driversData] = await Promise.all([fetchOrders(), fetchDrivers()]);
      setOrders(ordersData);
      setDrivers(driversData);

      const locMap: Record<string, TelemetryPing> = {};
      driversData.forEach((d) => {
        if (d.liveTelemetry) {
          locMap[d.id] = {
            driverId: d.id,
            lat: d.liveTelemetry.lat,
            lng: d.liveTelemetry.lng,
            heading: d.liveTelemetry.heading,
            speed: d.liveTelemetry.speed,
            timestamp: d.liveTelemetry.timestamp,
          };
        }
      });
      setDriverLocations(locMap);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    socket.emit('join:admin');

    const handleLocationUpdate = (data: TelemetryPing) => {
      setDriverLocations((prev) => ({
        ...prev,
        [data.driverId]: data,
      }));
    };

    const handleOrderCreated = (order: Order) => {
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
    };

    const handleOrderStatusUpdated = (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...order } : o)));
    };

    socket.on('location_update', handleLocationUpdate);
    socket.on('order_created', handleOrderCreated);
    socket.on('order_status_updated', handleOrderStatusUpdated);

    return () => {
      socket.off('location_update', handleLocationUpdate);
      socket.off('order_created', handleOrderCreated);
      socket.off('order_status_updated', handleOrderStatusUpdated);
    };
  }, []);

  const handleManualAssign = async (orderId: string, driverId: string) => {
    setAssigningId(orderId);
    try {
      const updated = await assignOrder(orderId, driverId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      console.error('Failed to assign order:', err);
    } finally {
      setAssigningId(null);
    }
  };

  const handleResetDemoState = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/demo/reset', { method: 'POST' });
      await loadData();
    } catch (err) {
      console.error('Failed to reset demo dataset:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await createOrder({
        pickupAddress: newPickupAddress,
        pickupLat: 25.2867 + (Math.random() - 0.5) * 0.04,
        pickupLng: 51.5333 + (Math.random() - 0.5) * 0.04,
        dropoffAddress: newDropoffAddress,
        dropoffLat: 25.3713 + (Math.random() - 0.5) * 0.04,
        dropoffLng: 51.5478 + (Math.random() - 0.5) * 0.04,
        customerName: newCustomerName,
        customerPhone: newCustomerPhone,
        itemsDescription: newItemsDesc,
      });
      setOrders((prev) => [created, ...prev]);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const inTransitOrders = orders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'ASSIGNED');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  // Filtered orders table
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.dropoffAddress.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'IN_TRANSIT'
        ? order.status === 'IN_TRANSIT' || order.status === 'ASSIGNED'
        : order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeDriver = drivers[0];
  const activeDriverCoords = activeDriver && driverLocations[activeDriver.id]
    ? {
        lat: driverLocations[activeDriver.id].lat,
        lng: driverLocations[activeDriver.id].lng,
        heading: driverLocations[activeDriver.id].heading,
      }
    : activeDriver
    ? { lat: activeDriver.currentLat, lng: activeDriver.currentLng, heading: 0 }
    : null;

  const activeMapOrder = selectedOrder || pendingOrders[0] || inTransitOrders[0] || orders[0];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col bg-md-surface text-md-on-surface transition-colors duration-300">
      {/* Top Header & Navigation Tabs (Material You Container) */}
      <div className="border-b border-md-outline/15 bg-md-surface-container px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-md-on-surface">Operations Command</h1>
            <p className="text-xs text-md-on-surface-variant">
              Live fleet management and automated delivery dispatch in Doha, Qatar.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetDemoState}
              disabled={isResetting}
              className="flex items-center gap-1.5 rounded-full border border-md-outline/25 bg-md-surface hover:bg-md-surface-low text-md-on-surface px-4 py-2 text-xs font-medium shadow-sm active:scale-95 transition-all"
              title="Reinstate 3 couriers and 4 Doha orders"
            >
              <RotateCcw className={`h-3.5 w-3.5 text-md-primary ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isResetting ? 'Resetting...' : 'Reset Demo Data'}</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-md-primary px-4 py-2 text-xs font-medium text-md-on-primary shadow-sm hover:shadow-md hover:bg-md-primary/90 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>New Delivery</span>
            </button>
          </div>
        </div>

        {/* Material You Tab Pills */}
        <div className="mx-auto mt-4 flex max-w-7xl gap-2 border-t border-md-outline/10 pt-3">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 active:scale-95 ${
              activeTab === 'map'
                ? 'bg-md-secondary-container text-md-on-secondary-container shadow-sm font-semibold'
                : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-low'
            }`}
          >
            <Compass className="h-3.5 w-3.5 text-md-primary" />
            <span>Live Dispatch Map</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 active:scale-95 ${
              activeTab === 'orders'
                ? 'bg-md-secondary-container text-md-on-secondary-container shadow-sm font-semibold'
                : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-low'
            }`}
          >
            <List className="h-3.5 w-3.5 text-md-primary" />
            <span>Orders Table ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 active:scale-95 ${
              activeTab === 'analytics'
                ? 'bg-md-secondary-container text-md-on-secondary-container shadow-sm font-semibold'
                : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-low'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-md-primary" />
            <span>Fleet Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 active:scale-95 ${
              activeTab === 'fleet'
                ? 'bg-md-secondary-container text-md-on-secondary-container shadow-sm font-semibold'
                : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-low'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-md-primary" />
            <span>Couriers Roster ({drivers.length})</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row (Material You Tonal Surfaces) */}
      <div className="border-b border-md-outline/15 bg-md-surface-container/50 px-6 py-4">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-md-outline/10 bg-md-surface p-4 shadow-sm">
            <span className="text-xs font-medium text-md-on-surface-variant">Active Fleet</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-md-on-surface">{drivers.length}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">100% Online</span>
            </div>
            <span className="text-[11px] text-md-on-surface-variant">Ready in Doha</span>
          </div>

          <div className="rounded-2xl border border-md-outline/10 bg-md-surface p-4 shadow-sm">
            <span className="text-xs font-medium text-md-on-surface-variant">Unassigned Orders</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-500">{pendingOrders.length}</span>
              <span className="text-xs text-md-on-surface-variant">Pending</span>
            </div>
            <span className="text-[11px] text-md-on-surface-variant">Awaiting allocation</span>
          </div>

          <div className="rounded-2xl border border-md-outline/10 bg-md-surface p-4 shadow-sm">
            <span className="text-xs font-medium text-md-on-surface-variant">In Transit</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-md-primary">{inTransitOrders.length}</span>
              <span className="text-xs text-md-on-surface-variant">En Route</span>
            </div>
            <span className="text-[11px] text-md-on-surface-variant">Streaming live telemetry</span>
          </div>

          <div className="rounded-2xl border border-md-outline/10 bg-md-surface p-4 shadow-sm">
            <span className="text-xs font-medium text-md-on-surface-variant">Completed Today</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{deliveredOrders.length}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">98.4% SLA</span>
            </div>
            <span className="text-[11px] text-md-on-surface-variant">Avg 22.4 mins</span>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {/* TAB 1: LIVE MAP & DISPATCH */}
        {activeTab === 'map' && (
          <div className="flex h-[calc(100vh-17rem)] w-full overflow-hidden">
            {/* Main Map */}
            <div className="relative flex-1 bg-md-surface">
              <MapboxMap
                center={[51.5310, 25.3280]}
                zoom={12.8}
                driverCoords={activeDriverCoords}
                pickupCoords={
                  activeMapOrder
                    ? { lat: activeMapOrder.pickupLat, lng: activeMapOrder.pickupLng, label: activeMapOrder.pickupAddress }
                    : null
                }
                dropoffCoords={
                  activeMapOrder
                    ? { lat: activeMapOrder.dropoffLat, lng: activeMapOrder.dropoffLng, label: activeMapOrder.dropoffAddress }
                    : null
                }
              />

              {/* Courier Status Toast */}
              {activeDriver && (
                <div className="absolute top-4 left-4 z-10 w-72 rounded-2xl border border-md-outline/20 bg-md-surface-container/95 p-4 backdrop-blur-md shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-md-on-surface">{activeDriver.name}</span>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {activeDriver.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-md-on-surface-variant mt-0.5">{activeDriver.vehicle}</div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-md-outline/15 pt-2 text-[11px] font-mono">
                    <span className="text-md-on-surface-variant">Speed:</span>
                    <span className="text-md-primary font-bold">
                      {(driverLocations[activeDriver.id]?.speed ?? 0).toFixed(0)} km/h
                    </span>
                    <span className="text-md-on-surface-variant">Heading:</span>
                    <span className="text-md-on-surface">
                      {(driverLocations[activeDriver.id]?.heading ?? 0).toFixed(0)}°
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Unassigned Queue Sidebar (Material You Surface) */}
            <div className="flex w-96 flex-col border-l border-md-outline/15 bg-md-surface-container/95 backdrop-blur-md">
              <div className="border-b border-md-outline/15 p-4">
                <h2 className="text-sm font-bold text-md-on-surface">Unassigned Orders ({pendingOrders.length})</h2>
                <p className="text-xs text-md-on-surface-variant mt-0.5">Click dispatch to allocate directly to courier</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {pendingOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-md-on-surface-variant">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <span className="text-xs font-medium text-md-on-surface">All orders dispatched</span>
                    <span className="text-[11px] text-md-on-surface-variant mt-1">Use "New Delivery" to create one</span>
                  </div>
                ) : (
                  pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                        selectedOrder?.id === order.id
                          ? 'border-md-primary bg-md-secondary-container shadow-md'
                          : 'border-md-outline/15 bg-md-surface hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-md-primary">
                          #{order.trackingCode}
                        </span>
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          PENDING
                        </span>
                      </div>

                      <div className="mt-2 text-xs font-bold text-md-on-surface">{order.customerName}</div>
                      <div className="text-[11px] text-md-on-surface-variant truncate">{order.itemsDescription}</div>

                      <div className="mt-3 space-y-1 text-[11px] border-t border-md-outline/15 pt-2 font-mono">
                        <div className="text-md-on-surface-variant truncate">📍 Pickup: {order.pickupAddress}</div>
                        <div className="text-md-on-surface-variant truncate">🏁 Dropoff: {order.dropoffAddress}</div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (drivers[0]) handleManualAssign(order.id, drivers[0].id);
                        }}
                        disabled={assigningId === order.id || drivers.length === 0}
                        className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-md-primary py-2 text-xs font-medium text-md-on-primary hover:bg-md-primary/90 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                      >
                        <Send className="h-3 w-3" />
                        <span>{assigningId === order.id ? 'Dispatching...' : 'Dispatch to Tariq'}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS TABLE & MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="mx-auto max-w-7xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-md-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Search tracking #, customer, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 rounded-full border border-md-outline/20 bg-md-surface-container py-2 pl-10 pr-4 text-xs text-md-on-surface placeholder-md-on-surface-variant/60 outline-none focus:border-md-primary shadow-sm"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-md-on-surface-variant mr-1">Status:</span>
                {(['ALL', 'PENDING', 'IN_TRANSIT', 'DELIVERED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all active:scale-95 ${
                      statusFilter === st
                        ? 'bg-md-primary text-md-on-primary shadow-sm'
                        : 'bg-md-surface-container text-md-on-surface-variant hover:text-md-on-surface border border-md-outline/15'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table Container */}
            <div className="overflow-hidden rounded-[24px] border border-md-outline/15 bg-md-surface-container shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-md-outline/15 bg-md-surface-low text-md-on-surface-variant">
                  <tr>
                    <th className="p-4 font-semibold">Tracking #</th>
                    <th className="p-4 font-semibold">Customer</th>
                    <th className="p-4 font-semibold">Pickup Location</th>
                    <th className="p-4 font-semibold">Destination</th>
                    <th className="p-4 font-semibold">Assigned Courier</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-md-outline/10">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-md-on-surface-variant">
                        No orders matching current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-md-surface-low/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-md-primary">
                          #{order.trackingCode}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-md-on-surface">{order.customerName}</div>
                          <div className="text-[11px] text-md-on-surface-variant">{order.customerPhone}</div>
                        </td>
                        <td className="p-4 text-md-on-surface-variant max-w-[180px] truncate">{order.pickupAddress}</td>
                        <td className="p-4 text-md-on-surface-variant max-w-[180px] truncate">{order.dropoffAddress}</td>
                        <td className="p-4">
                          {order.driver ? (
                            <span className="text-md-on-surface font-medium">{order.driver.name}</span>
                          ) : (
                            <span className="text-md-on-surface-variant italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-0.5 text-[10px] font-semibold ${
                              order.status === 'DELIVERED'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : order.status === 'IN_TRANSIT'
                                ? 'bg-md-secondary-container text-md-on-secondary-container'
                                : order.status === 'ASSIGNED'
                                ? 'bg-md-tertiary-container text-md-on-tertiary-container'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {order.status === 'PENDING' ? (
                            <button
                              onClick={() => {
                                if (drivers[0]) handleManualAssign(order.id, drivers[0].id);
                              }}
                              disabled={assigningId === order.id}
                              className="rounded-full bg-md-primary px-3.5 py-1 text-xs font-medium text-md-on-primary hover:bg-md-primary/90 shadow-sm active:scale-95"
                            >
                              Dispatch
                            </button>
                          ) : (
                            <a
                              href={`/track/${order.trackingCode}`}
                              target="_blank"
                              className="text-xs text-md-primary hover:underline font-mono"
                            >
                              Track →
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FLEET ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="mx-auto max-w-7xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deliveries by Hour Chart */}
              <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-sm">
                <h3 className="text-sm font-bold text-md-on-surface mb-1">Today's Delivery Volume</h3>
                <p className="text-xs text-md-on-surface-variant mb-6">Dispatched packages per 2-hour window in Doha</p>

                <div className="flex h-48 items-end gap-3 pt-4 border-b border-md-outline/15 pb-2">
                  {[
                    { hour: '08:00', count: 12 },
                    { hour: '10:00', count: 28 },
                    { hour: '12:00', count: 45 },
                    { hour: '14:00', count: 34 },
                    { hour: '16:00', count: 52 },
                    { hour: '18:00', count: 68 },
                    { hour: '20:00', count: 41 },
                  ].map((bar) => (
                    <div key={bar.hour} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-[10px] text-md-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        {bar.count}
                      </div>
                      <div
                        className="w-full rounded-t-full bg-md-primary transition-all duration-300 group-hover:bg-md-tertiary"
                        style={{ height: `${(bar.count / 70) * 100}%` }}
                      />
                      <span className="text-[10px] text-md-on-surface-variant font-mono">{bar.hour}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-6 shadow-sm">
                <h3 className="text-sm font-bold text-md-on-surface mb-1">Fleet Service Level Agreement</h3>
                <p className="text-xs text-md-on-surface-variant mb-6">Fulfillment KPI breakdown</p>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-md-on-surface-variant">Delivered On-Time</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">98.4%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-md-surface-low overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.4%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-md-on-surface-variant">Courier Telemetry Health</span>
                      <span className="text-md-primary font-bold">100% Active</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-md-surface-low overflow-hidden">
                      <div className="h-full bg-md-primary rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-md-on-surface-variant">Customer Satisfaction (Qatar)</span>
                      <span className="text-amber-500 font-bold">4.96 / 5.0</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-md-surface-low overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '99%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COURIERS ROSTER */}
        {activeTab === 'fleet' && (
          <div className="mx-auto max-w-7xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drivers.map((d) => (
                <div key={d.id} className="rounded-[24px] border border-md-outline/15 bg-md-surface-container p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-md-primary text-md-on-primary font-bold text-xs shadow-sm">
                        {d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-md-on-surface text-sm">{d.name}</div>
                        <div className="text-xs text-md-on-surface-variant">{d.phone}</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      {d.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-md-outline/10 pt-3 text-xs font-mono">
                    <div>
                      <span className="text-md-on-surface-variant">Vehicle:</span>
                      <div className="text-md-on-surface font-semibold">{d.vehicle}</div>
                    </div>
                    <div>
                      <span className="text-md-on-surface-variant">Latest GPS:</span>
                      <div className="text-md-primary">
                        {driverLocations[d.id]?.lat.toFixed(4) ?? d.currentLat.toFixed(4)},{' '}
                        {driverLocations[d.id]?.lng.toFixed(4) ?? d.currentLng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Order Modal (Material You Dialog) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-md-outline/20 bg-md-surface-container p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-md-outline/15 pb-3.5">
              <h3 className="text-base font-bold text-md-on-surface">Create New Delivery</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-1 text-md-on-surface-variant hover:text-md-on-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-md-on-surface-variant mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="block w-full h-11 rounded-t-xl rounded-b-none border-b-2 border-md-outline/40 focus:border-md-primary bg-md-surface-low px-3.5 text-xs text-md-on-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-md-on-surface-variant mb-1">Customer Phone</label>
                <input
                  type="text"
                  required
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="block w-full h-11 rounded-t-xl rounded-b-none border-b-2 border-md-outline/40 focus:border-md-primary bg-md-surface-low px-3.5 text-xs text-md-on-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-md-on-surface-variant mb-1">Pickup Address (Doha)</label>
                <input
                  type="text"
                  required
                  value={newPickupAddress}
                  onChange={(e) => setNewPickupAddress(e.target.value)}
                  className="block w-full h-11 rounded-t-xl rounded-b-none border-b-2 border-md-outline/40 focus:border-md-primary bg-md-surface-low px-3.5 text-xs text-md-on-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-md-on-surface-variant mb-1">Dropoff Address (Doha)</label>
                <input
                  type="text"
                  required
                  value={newDropoffAddress}
                  onChange={(e) => setNewDropoffAddress(e.target.value)}
                  className="block w-full h-11 rounded-t-xl rounded-b-none border-b-2 border-md-outline/40 focus:border-md-primary bg-md-surface-low px-3.5 text-xs text-md-on-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-md-on-surface-variant mb-1">Items Description</label>
                <input
                  type="text"
                  required
                  value={newItemsDesc}
                  onChange={(e) => setNewItemsDesc(e.target.value)}
                  className="block w-full h-11 rounded-t-xl rounded-b-none border-b-2 border-md-outline/40 focus:border-md-primary bg-md-surface-low px-3.5 text-xs text-md-on-surface outline-none"
                />
              </div>

              <div className="mt-6 flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-full border border-md-outline/25 bg-md-surface-low py-2.5 text-xs font-medium text-md-on-surface hover:bg-md-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-full bg-md-primary py-2.5 text-xs font-medium text-md-on-primary hover:bg-md-primary/90 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Ingest Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
