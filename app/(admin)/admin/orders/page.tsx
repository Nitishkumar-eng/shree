"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/Providers";
import { formatINR } from "@/lib/gst";
import { 
  History, 
  Search, 
  ArrowRight, 
  Printer, 
  MapPin, 
  Phone, 
  User, 
  AlertTriangle 
} from "lucide-react";

interface Payment {
  status: string;
  method: string | null;
  razorpayPaymentId: string | null;
}

interface Order {
  id: string;
  status: string;
  subtotal: number;
  gstAmount: number;
  delivery: number;
  discount: number;
  total: number;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  locationCity?: string;
  locationState?: string;
  trackingNumber?: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
  address: {
    name: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    priceAtPurchase: number;
    gstRate: number;
    variant: {
      sku: string;
      product: {
        name: string;
      };
    };
  }>;
  payments: Payment[];
  shiprocketOrderId?: string | null;
  shiprocketShipmentId?: string | null;
  awbNumber?: string | null;
  courierName?: string | null;
  shippingLabelUrl?: string | null;
}

export default function AdminOrdersPage() {
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
      toast("Error loading customer orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Update order status trigger
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast(`Order status updated to ${newStatus}`, "success");
        loadOrders();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update status", "error");
      }
    } catch {
      toast("Network error occurred", "error");
    }
  };

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

  // Filter orders based on search and status
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.user.name.toLowerCase().includes(search.toLowerCase()) ||
      o.address.pincode.includes(search);
    const matchesStatus = statusFilter === "" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-10 items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-500">Retrieving platform order list...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="text-indigo-400" /> Platform Orders
          </h1>
          <p className="text-xs text-slate-500 mt-1">Monitor all client transactions, verify payments, update fulfillment, and issue invoices</p>
        </div>
      </div>

      {/* Filters panel */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center glass-card p-4 rounded-xl border border-slate-900">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search by order ID, customer, zip..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-300 placeholder-slate-650"
          />
          <Search className="absolute left-3.5 top-2.5 text-slate-600" size={14} />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-xs font-semibold text-slate-400 focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
        >
          <option value="">All Fulfillment Statuses</option>
          <option value="PENDING">Pending Payment</option>
          <option value="CONFIRMED">Payment Confirmed</option>
          <option value="PROCESSING">Fulfillment Processing</option>
          <option value="SHIPPED">Shipped (In Transit)</option>
          <option value="DELIVERED">Delivered successfully</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="RETURN_REQUESTED">Return Requested</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {/* Orders Grid */}
      <div className="flex flex-col gap-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl p-8 border border-slate-800">
            <AlertTriangle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-400 uppercase">No Orders Found</h3>
            <p className="text-xs text-slate-500 mt-1">Modify your search query or check the dropdown filters.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={order.id}
                className="glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center"
              >
                {/* Metadatas */}
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-indigo-400">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusColors[order.status] || "text-slate-400 bg-slate-900 border-slate-800"}`}>
                      {order.status}
                    </span>
                    <span className="text-[10px] text-slate-500">{dateStr}</span>
                  </div>

                  {/* Customer details */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User size={12} className="text-slate-600" /> {order.user.name} ({order.user.email})
                    </span>
                    <span className="text-slate-700">|</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-slate-600" /> Pincode: {order.address.pincode} ({order.address.state})
                    </span>
                    {order.latitude && (
                      <>
                        <span className="text-slate-700">|</span>
                        <a
                          href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#e11d48', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          <MapPin size={11} /> {order.locationCity || 'View Location'} 📍
                        </a>
                      </>
                    )}
                    {order.trackingNumber && (
                      <>
                        <span className="text-slate-700">|</span>
                        <span style={{ color: '#1e40af', fontWeight: 700, fontSize: '11px' }}>🚚 {order.trackingNumber}</span>
                      </>
                    )}
                  </div>

                  {/* Item descriptions */}
                  <div className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900 mt-2">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Purchased Products</span>
                    <ul className="list-disc list-inside flex flex-col gap-1 text-[11px]">
                      {order.items.map((i) => (
                        <li key={i.id} className="truncate">
                          <strong>{i.variant.product.name}</strong> (SKU: {i.variant.sku}) x{i.quantity} @ {formatINR(i.priceAtPurchase)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Shiprocket Fulfillment details */}
                  {order.shiprocketShipmentId && (
                    <div className="mt-2 text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Shiprocket Fulfillment:</span>
                      <span>Order ID: <strong className="text-slate-300 font-mono">{order.shiprocketOrderId}</strong></span>
                      <span className="text-slate-650">|</span>
                      <span>Shipment ID: <strong className="text-slate-300 font-mono">{order.shiprocketShipmentId}</strong></span>
                      {order.awbNumber && (
                        <>
                          <span className="text-slate-655">|</span>
                          <span className="text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[10px]">
                            AWB: {order.awbNumber} ({order.courierName})
                          </span>
                          {order.shippingLabelUrl && (
                            <>
                              <span className="text-slate-650">|</span>
                              <a 
                                href={order.shippingLabelUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-indigo-400 hover:text-indigo-300 font-bold underline flex items-center gap-1 text-[10px]"
                              >
                                Download Label PDF 📄
                              </a>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Status updates select dropdown & actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-3 self-stretch lg:self-auto flex-shrink-0">
                  {/* Status toggle select */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Update status:</span>
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="PENDING">Pending Payment</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="RETURN_REQUESTED">Return Requested</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>

                  {/* Pricing and Invoices print */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 mt-2">
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Net Amount</span>
                      <span className="text-sm font-black text-white">{formatINR(order.total)}</span>
                    </div>
                    
                    <a
                      href={`/api/orders/${order.id}/invoice`}
                      download
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:text-indigo-400 transition-colors"
                      title="Download GST invoice PDF"
                    >
                      <Printer size={14} />
                    </a>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      </div>
  );
}
