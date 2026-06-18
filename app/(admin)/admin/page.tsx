"use client";

import React, { useState, useEffect } from "react";
import { formatINR } from "@/lib/gst";
import {
  IndianRupee,
  ShoppingBag,
  Users,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Package,
  MapPin,
  Truck,
  Clock,
  CheckCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Metrics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  conversionRate: number;
  lowStockCount: number;
}

interface TopProduct {
  name: string;
  brand: string;
  salesCount: number;
  revenue: number;
}

interface LowStockAlert {
  id: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock: number;
}

interface ChartData {
  name: string;
  Revenue: number;
}

interface ShippingCounts {
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
}

interface RecentShipment {
  id: string;
  status: string;
  total: number;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  latitude: number | null;
  longitude: number | null;
  locationCity: string | null;
  locationState: string | null;
  customerName: string;
  city: string;
  state: string;
  pincode: string;
  street: string;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [shippingCounts, setShippingCounts] = useState<ShippingCounts | null>(null);
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setChartData(data.revenueChart);
        setTopProducts(data.topProducts);
        setLowStock(data.lowStockAlerts);
        setShippingCounts(data.shippingCounts);
        setRecentShipments(data.recentShipments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-10 items-center justify-center min-h-[55vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
        <p className="text-xs text-slate-500">Compiling database analytics...</p>
      </div>
    );
  }

  const shippingStatusColors: Record<string, string> = {
    PENDING: "text-amber-400 bg-amber-500/10",
    CONFIRMED: "text-blue-400 bg-blue-500/10",
    PROCESSING: "text-indigo-400 bg-indigo-500/10",
    SHIPPED: "text-purple-400 bg-purple-500/10",
    DELIVERED: "text-emerald-400 bg-emerald-500/10",
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div style={{ borderBottom: '2px solid #fbcfe8', paddingBottom: '16px' }}>
        <h1 style={{ fontFamily: 'Georgia,serif', color: '#e11d48', fontSize: '28px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          🌸 Dewkit Admin Dashboard
        </h1>
        <p style={{ color: '#9c4060', fontSize: '13px', margin: '4px 0 0' }}>Real-time skincare store analytics · Revenue · Inventory · Shipping & Operations</p>
      </div>

      {/* Metrics Cards Grid */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-3">
            <div className="flex justify-between items-center w-full">
              <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase">Gross Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-450">
                <IndianRupee size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white">{formatINR(metrics.totalRevenue)}</h3>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Taxes included</p>
            </div>
          </div>

          {/* Orders count */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-3">
            <div className="flex justify-between items-center w-full">
              <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase">Orders count</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-450">
                <ShoppingBag size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white">{metrics.totalOrders}</h3>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Processed sales</p>
            </div>
          </div>

          {/* Customer count */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-3">
            <div className="flex justify-between items-center w-full">
              <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase">Customers</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-450">
                <Users size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white">{metrics.totalCustomers}</h3>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Registered logins</p>
            </div>
          </div>

          {/* Conversion rate */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-3">
            <div className="flex justify-between items-center w-full">
              <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase">Conversion Rate</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-450">
                <TrendingUp size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white">{metrics.conversionRate}%</h3>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Traffic to order splits</p>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Status Operations Metrics */}
      {shippingCounts && (
        <div className="flex flex-col gap-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Live Shipment Pipeline</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Pending Payment", value: shippingCounts.pending, color: "text-amber-400 bg-amber-500/5 border-amber-500/20", icon: Clock },
              { label: "Confirmed", value: shippingCounts.confirmed, color: "text-blue-400 bg-blue-500/5 border-blue-500/20", icon: CheckCircle },
              { label: "Processing", value: shippingCounts.processing, color: "text-indigo-400 bg-indigo-500/5 border-indigo-500/20", icon: Package },
              { label: "Shipped (In Transit)", value: shippingCounts.shipped, color: "text-purple-400 bg-purple-500/5 border-purple-500/20", icon: Truck },
              { label: "Delivered", value: shippingCounts.delivered, color: "text-emerald-400 bg-emerald-500/5 border-emerald-500/20", icon: CheckCircle },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className={`rounded-xl border p-4 flex flex-col gap-2 ${stat.color}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{stat.label}</span>
                    <Icon size={14} />
                  </div>
                  <span className="text-2xl font-black">{stat.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Revenue line chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Revenue Trend (Last 7 Days)</span>
          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a1018" vertical={false} />
                <XAxis dataKey="name" stroke="#be185d" fontSize={10} tickLine={false} />
                <YAxis stroke="#be185d" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px" }}
                  labelStyle={{ color: "#be185d", fontSize: "10px", fontWeight: 700 }}
                  itemStyle={{ color: "#e11d48", fontSize: "12px", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="Revenue" stroke="#e11d48" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={14} className="text-rose-400" /> Best Sellers
          </span>
          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">No sales registered yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-900 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-200 truncate">{p.name}</h4>
                    <span className="text-[9px] text-slate-500 font-semibold uppercase">{p.brand}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-white block">{p.salesCount} sold</span>
                    <span className="text-[10px] text-rose-400">{formatINR(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shipping & Fulfillment Log Table */}
      {recentShipments.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Truck size={14} className="text-rose-450" /> Shipping & Fulfillment Operations
            </span>
            <span className="text-[10px] font-bold text-slate-500">Live coordinates mapping active</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 uppercase text-[9px] tracking-wider">
                  <th className="py-2.5">Order ID</th>
                  <th className="py-2.5">Customer Name</th>
                  <th className="py-2.5">Delivery Destination</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Carrier Tracking</th>
                  <th className="py-2.5 text-right">Maps Navigation</th>
                </tr>
              </thead>
              <tbody>
                {recentShipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/10 transition-colors">
                    <td className="py-3 font-mono font-bold text-indigo-400">
                      #{shipment.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3 font-semibold text-slate-200">{shipment.customerName}</td>
                    <td className="py-3 text-slate-400">
                      {shipment.city}, {shipment.state} ({shipment.pincode})
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border border-transparent ${shippingStatusColors[shipment.status] || "text-slate-400 bg-slate-800"}`}>
                        {shipment.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-purple-400 font-bold">
                      {shipment.trackingNumber ? `🚚 ${shipment.trackingNumber}` : <span className="text-slate-600">Unassigned</span>}
                    </td>
                    <td className="py-3 text-right">
                      {shipment.latitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${shipment.latitude},${shipment.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-450 hover:underline"
                        >
                          <MapPin size={11} /> {shipment.locationCity || "View Route"} 📍
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-medium">GPS Off</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory Alerts section */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500" /> Inventory Stock Alerts
          </span>
          {metrics && metrics.lowStockCount > 0 && (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 py-0.5 px-2.5 rounded-full">
              {metrics.lowStockCount} Variants Low
            </span>
          )}
        </div>

        {lowStock.length === 0 ? (
          <p className="text-xs text-emerald-400 py-4 font-semibold">✓ All product variant inventory levels are healthy!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 uppercase text-[9px] tracking-wider">
                  <th className="py-2.5">Product Name</th>
                  <th className="py-2.5">SKU ID</th>
                  <th className="py-2.5">Size/Color</th>
                  <th className="py-2.5 text-right">Units Remaining</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((v) => (
                  <tr key={v.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/10 transition-colors">
                    <td className="py-3 font-semibold text-slate-200">{v.productName}</td>
                    <td className="py-3 font-mono text-[10px] text-slate-400">{v.sku}</td>
                    <td className="py-3 text-slate-400">
                      {v.size || "Standard"} / {v.color || "Standard"}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`font-bold px-2 py-0.5 rounded-md ${v.stock === 0 ? "text-rose-400 bg-rose-500/10" : "text-amber-400 bg-amber-500/10"}`}>
                        {v.stock === 0 ? "Out of Stock" : `${v.stock} units`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
