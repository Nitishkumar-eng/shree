"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatINR } from "@/lib/gst";
import { History, ArrowRight, Eye, Calendar, Tag } from "lucide-react";
import Link from "next/link";

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    variant: {
      product: {
        name: string;
      };
    };
  }>;
}

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!session) return;
      try {
        const res = await fetch("/api/orders");
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error("Fetch orders list error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [session]);

  const statusColors: Record<string, string> = {
    PENDING: "text-amber-400 bg-amber-950/40 border-amber-500/20",
    CONFIRMED: "text-blue-400 bg-blue-950/40 border-blue-500/20",
    PROCESSING: "text-indigo-400 bg-indigo-950/40 border-indigo-500/20",
    SHIPPED: "text-purple-400 bg-purple-950/40 border-purple-500/20",
    DELIVERED: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20",
    CANCELLED: "text-slate-500 bg-slate-900 border-slate-800",
    RETURN_REQUESTED: "text-rose-400 bg-rose-950/40 border-rose-500/20",
    REFUNDED: "text-teal-400 bg-teal-950/40 border-teal-500/20",
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-10 items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-500">Loading order records...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <History className="text-indigo-400" /> Order History
        </h1>
        <p className="text-xs text-slate-500 mt-1">Track the status, view HSN summaries, and download GST tax invoices</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl p-8 border border-slate-800">
          <History className="w-16 h-16 text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-300">No Orders Placed</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">You haven't placed any orders yet. Visit our shop and check out items.</p>
          <Link
            href="/products"
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl text-xs transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={order.id}
                className="glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono font-bold text-sm text-slate-300">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[order.status] || "text-slate-400 bg-slate-900 border-slate-800"}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} /> {dateStr}
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1 font-semibold text-slate-400">
                      Total: {formatINR(order.total)}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 mt-1">
                    Items: {order.items.map((i) => `${i.variant.product.name} (x${i.quantity})`).join(", ")}
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Link
                    href={`/orders/${order.id}`}
                    className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-indigo-400 transition-all flex items-center gap-1.5"
                  >
                    <Eye size={12} /> View Details <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
