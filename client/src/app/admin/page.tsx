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

  // New Order Form state
  const [newPickupAddress, setNewPickupAddress] = useState('Souq Waqif Logistics Hub');
  const [newDropoffAddress, setNewDropoffAddress] = useState('Tower 18, Porto Arabia, The Pearl');
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
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col bg-slate-950 text-slate-100">
      {/* Top Header & Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Operations Command</h1>
            <p className="text-xs text-slate-400">
              Live fleet management and automated delivery dispatch in Doha, Qatar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>New Delivery</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto mt-4 flex max-w-7xl gap-2 border-t border-slate-800/80 pt-3">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'map'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Live Dispatch Map</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>Orders Table ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Fleet Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'fleet'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Couriers Roster ({drivers.length})</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="border-b border-slate-800 bg-slate-900/30 px-6 py-4">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs font-medium text-slate-400">Active Fleet</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{drivers.length}</span>
              <span className="text-xs text-emerald-400 font-medium">100% Online</span>
            </div>
            <span className="text-[11px] text-slate-500">Ready in West Bay</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs font-medium text-slate-400">Unassigned Orders</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400">{pendingOrders.length}</span>
              <span className="text-xs text-slate-400">Pending</span>
            </div>
            <span className="text-[11px] text-slate-500">Awaiting allocation</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs font-medium text-slate-400">In Transit</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-sky-400">{inTransitOrders.length}</span>
              <span className="text-xs text-slate-400">En Route</span>
            </div>
            <span className="text-[11px] text-slate-500">Streaming live telemetry</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs font-medium text-slate-400">Completed Today</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">{deliveredOrders.length}</span>
              <span className="text-xs text-emerald-400 font-medium">98.4% On-Time</span>
            </div>
            <span className="text-[11px] text-slate-500">Avg 22.4 mins</span>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {/* TAB 1: LIVE MAP & DISPATCH */}
        {activeTab === 'map' && (
          <div className="flex h-[calc(100vh-17rem)] w-full overflow-hidden">
            {/* Main Map */}
            <div className="relative flex-1 bg-slate-950">
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
                <div className="absolute top-4 left-4 z-10 w-72 rounded-lg border border-slate-800 bg-slate-900/90 p-3.5 backdrop-blur-md shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{activeDriver.name}</span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {activeDriver.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{activeDriver.vehicle}</div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-800 pt-2 text-[11px] font-mono">
                    <span className="text-slate-400">Speed:</span>
                    <span className="text-sky-400 font-bold">
                      {(driverLocations[activeDriver.id]?.speed ?? 0).toFixed(0)} km/h
                    </span>
                    <span className="text-slate-400">Heading:</span>
                    <span className="text-slate-200">
                      {(driverLocations[activeDriver.id]?.heading ?? 0).toFixed(0)}°
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Unassigned Queue Sidebar */}
            <div className="flex w-96 flex-col border-l border-slate-800 bg-slate-900/90 backdrop-blur-md">
              <div className="border-b border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-white">Unassigned Orders ({pendingOrders.length})</h3>
                <p className="text-xs text-slate-400 mt-0.5">Click dispatch to send directly to rider</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {pendingOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                    <span className="text-xs font-medium text-slate-300">All orders dispatched</span>
                    <span className="text-[11px] text-slate-500 mt-1">Use "New Delivery" to create one</span>
                  </div>
                ) : (
                  pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                        selectedOrder?.id === order.id
                          ? 'border-blue-500 bg-slate-800/80 shadow-md'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-sky-400">
                          #{order.trackingCode}
                        </span>
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                          PENDING
                        </span>
                      </div>

                      <div className="mt-1.5 text-xs font-semibold text-white">{order.customerName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{order.itemsDescription}</div>

                      <div className="mt-2.5 space-y-1 text-[11px] border-t border-slate-800/80 pt-2 font-mono">
                        <div className="text-slate-300 truncate">📍 Pickup: {order.pickupAddress}</div>
                        <div className="text-slate-300 truncate">🏁 Dropoff: {order.dropoffAddress}</div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (drivers[0]) handleManualAssign(order.id, drivers[0].id);
                        }}
                        disabled={assigningId === order.id || drivers.length === 0}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-all disabled:opacity-50"
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tracking #, customer, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status:</span>
                {(['ALL', 'PENDING', 'IN_TRANSIT', 'DELIVERED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === st
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3.5 font-semibold">Tracking #</th>
                    <th className="p-3.5 font-semibold">Customer</th>
                    <th className="p-3.5 font-semibold">Pickup</th>
                    <th className="p-3.5 font-semibold">Destination</th>
                    <th className="p-3.5 font-semibold">Courier</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No orders matching current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-sky-400">
                          #{order.trackingCode}
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-white">{order.customerName}</div>
                          <div className="text-[11px] text-slate-400">{order.customerPhone}</div>
                        </td>
                        <td className="p-3.5 text-slate-300 max-w-[180px] truncate">{order.pickupAddress}</td>
                        <td className="p-3.5 text-slate-300 max-w-[180px] truncate">{order.dropoffAddress}</td>
                        <td className="p-3.5">
                          {order.driver ? (
                            <span className="text-white font-medium">{order.driver.name}</span>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              order.status === 'DELIVERED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : order.status === 'IN_TRANSIT'
                                ? 'bg-sky-500/20 text-sky-400'
                                : order.status === 'ASSIGNED'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {order.status === 'PENDING' ? (
                            <button
                              onClick={() => {
                                if (drivers[0]) handleManualAssign(order.id, drivers[0].id);
                              }}
                              disabled={assigningId === order.id}
                              className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500"
                            >
                              Dispatch
                            </button>
                          ) : (
                            <a
                              href={`/track/${order.trackingCode}`}
                              target="_blank"
                              className="text-xs text-blue-400 hover:underline font-mono"
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
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Today's Delivery Volume</h3>
                <p className="text-xs text-slate-400 mb-6">Dispatched packages per 2-hour window</p>

                <div className="flex h-48 items-end gap-3 pt-4 border-b border-slate-800 pb-2">
                  {[
                    { hour: '08:00', count: 12 },
                    { hour: '10:00', count: 28 },
                    { hour: '12:00', count: 45 },
                    { hour: '14:00', count: 34 },
                    { hour: '16:00', count: 52 },
                    { hour: '18:00', count: 68 },
                    { hour: '20:00', count: 41 },
                  ].map((bar, i) => (
                    <div key={bar.hour} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {bar.count}
                      </div>
                      <div
                        className="w-full rounded-t bg-blue-600 transition-all group-hover:bg-sky-400"
                        style={{ height: `${(bar.count / 70) * 100}%` }}
                      />
                      <span className="text-[10px] text-slate-400 font-mono">{bar.hour}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Fleet Service Level Agreement</h3>
                <p className="text-xs text-slate-400 mb-6">Fulfillment KPI breakdown</p>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Delivered On-Time</span>
                      <span className="text-emerald-400 font-semibold">98.4%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.4%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Courier Utilization</span>
                      <span className="text-sky-400 font-semibold">87.2%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: '87.2%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Customer Rating (Qatar)</span>
                      <span className="text-amber-400 font-semibold">4.96 / 5.0</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: '99%' }} />
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
                <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                        TA
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{d.name}</div>
                        <div className="text-xs text-slate-400">{d.phone}</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                      {d.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-3 text-xs font-mono">
                    <div>
                      <span className="text-slate-500">Vehicle:</span>
                      <div className="text-slate-200">{d.vehicle}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Latest GPS:</span>
                      <div className="text-sky-400">
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

      {/* New Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create New Delivery</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300">Customer Name</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Customer Phone</label>
                <input
                  type="text"
                  required
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Pickup Address (Doha)</label>
                <input
                  type="text"
                  required
                  value={newPickupAddress}
                  onChange={(e) => setNewPickupAddress(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Dropoff Address (Doha)</label>
                <input
                  type="text"
                  required
                  value={newDropoffAddress}
                  onChange={(e) => setNewDropoffAddress(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Items Description</label>
                <input
                  type="text"
                  required
                  value={newItemsDesc}
                  onChange={(e) => setNewItemsDesc(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-md disabled:opacity-50"
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
