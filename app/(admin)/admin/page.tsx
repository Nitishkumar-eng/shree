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
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
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
      <div className="flex flex-col gap-6 py-10 items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-500">Compiling database analytics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div style={{ borderBottom: '2px solid #fbcfe8', paddingBottom: '16px' }}>
        <h1 style={{ fontFamily: 'Georgia,serif', color: '#e11d48', fontSize: '28px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          🌸 Dewkit Admin Dashboard
        </h1>
        <p style={{ color: '#9c4060', fontSize: '13px', margin: '4px 0 0' }}>Real-time skincare store analytics · Revenue · Inventory · Orders</p>
      </div>

      {/* Metrics Cards Grid */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-3">
            <div className="flex justify-between items-center w-full">
              <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase">Gross Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
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
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
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
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
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
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
                <XAxis dataKey="name" stroke="#be185d" fontSize={10} tickLine={false} />
                <YAxis stroke="#be185d" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff0f6", borderColor: "#fbcfe8", borderRadius: "12px" }}
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
            <Sparkles size={14} className="text-indigo-400" /> Best Sellers
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
                    <span className="text-[10px] text-indigo-400">{formatINR(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
