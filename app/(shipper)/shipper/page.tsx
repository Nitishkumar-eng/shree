"use client";

import React, { useEffect, useState } from "react";
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle, 
  Search, 
  AlertTriangle, 
  MapPin, 
  Phone, 
  User, 
  ExternalLink, 
  RefreshCw, 
  FileText,
  CheckSquare
} from "lucide-react";

interface Order {
  id: string;
  status: string;
  total: number;
  trackingNumber?: string;
  shippingNotes?: string;
  createdAt: string;
  locationCity?: string;
  locationState?: string;
  latitude?: number;
  longitude?: number;
  user: { name: string; email: string; phone?: string | null };
  address: { name: string; street: string; city: string; state: string; pincode: string; phone: string };
  items: { id: string; quantity: number; priceAtPurchase: number; variant: { color?: string | null; size?: string | null; product: { name: string } } }[];
  shiprocketOrderId?: string | null;
  shiprocketShipmentId?: string | null;
  awbNumber?: string | null;
  courierName?: string | null;
  shippingLabelUrl?: string | null;
}

export default function ShipperPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [notesInputs, setNotesInputs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Shiprocket states
  const [loadingShiprocket, setLoadingShiprocket] = useState<Record<string, boolean>>({});
  const [shiprocketRates, setShiprocketRates] = useState<Record<string, any[]>>({});
  const [selectedCouriers, setSelectedCouriers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/shipper/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrder(orderId: string, status: string) {
    setUpdating(orderId);
    try {
      const res = await fetch("/api/shipper/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status,
          trackingNumber: trackingInputs[orderId],
          shippingNotes: notesInputs[orderId],
        }),
      });
      if (res.ok) {
        await fetchOrders();
      }
    } catch (err) {
      console.error("Error updating order:", err);
    } finally {
      setUpdating(null);
    }
  }

  // Shiprocket 1: Push Order and get Rates
  async function pushToShiprocket(orderId: string) {
    setLoadingShiprocket(p => ({ ...p, [orderId] : true }));
    try {
      const res = await fetch("/api/shipper/shiprocket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setShiprocketRates(p => ({ ...p, [orderId]: data.courierRates || [] }));
        if (data.courierRates && data.courierRates.length > 0) {
          // Select cheapest by default
          setSelectedCouriers(p => ({ ...p, [orderId]: String(data.courierRates[0].courier_company_id) }));
        }
        await fetchOrders(); // refresh shipment IDs
      } else {
        alert(data.error || "Failed to push order to Shiprocket");
      }
    } catch (err) {
      console.error(err);
      alert("Network error connecting to Shiprocket");
    } finally {
      setLoadingShiprocket(p => ({ ...p, [orderId]: false }));
    }
  }

  // Shiprocket 2: Finalize booking, generate AWB & Label
  async function bookShiprocketCourier(orderId: string) {
    const courierId = selectedCouriers[orderId];
    const rates = shiprocketRates[orderId] || [];
    const courier = rates.find(r => String(r.courier_company_id) === courierId);
    
    if (!courierId || !courier) {
      alert("Please select a courier partner");
      return;
    }

    setUpdating(orderId);
    try {
      const res = await fetch("/api/shipper/shiprocket", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          courierCompanyId: courier.courier_company_id,
          courierName: courier.courier_name,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Shipment booked! AWB Assigned: ${data.order.awbNumber}`);
        // Clear rates selection
        setShiprocketRates(p => {
          const clone = { ...p };
          delete clone[orderId];
          return clone;
        });
        await fetchOrders();
      } else {
        alert(data.error || "Failed to book courier");
      }
    } catch (err) {
      console.error(err);
      alert("Network error booking shipment");
    } finally {
      setUpdating(null);
    }
  }

  const NEXT_STATUS: Record<string, string> = {
    CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "DELIVERED",
  };

  const statusColors: Record<string, string> = {
    PENDING: "text-amber-400 bg-amber-950/40 border-amber-500/20",
    CONFIRMED: "text-blue-400 bg-blue-950/40 border-blue-500/20",
    PROCESSING: "text-indigo-400 bg-indigo-950/40 border-indigo-500/20",
    SHIPPED: "text-purple-400 bg-purple-950/40 border-purple-500/20",
    DELIVERED: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20",
    CANCELLED: "text-slate-500 bg-slate-900 border-slate-800",
  };

  const filtered = orders.filter(o => {
    const matchesStatus = filter === "ALL" || o.status === filter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;
    return matchesStatus && (
      o.id.toLowerCase().includes(q) ||
      o.address.city.toLowerCase().includes(q) ||
      o.address.state.toLowerCase().includes(q) ||
      o.address.pincode.includes(q) ||
      o.address.name.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: orders.length,
    processing: orders.filter(o => o.status === "PROCESSING").length,
    shipped: orders.filter(o => o.status === "SHIPPED").length,
    delivered: orders.filter(o => o.status === "DELIVERED").length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Truck className="text-rose-500" size={26} /> Shipper Operations Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage active shipments, query Shiprocket logistics rates, and log delivery completions.
          </p>
        </div>
        <button 
          onClick={fetchOrders}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-350 hover:bg-slate-850 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh Portal
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-3">
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase">Active Shipments</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Package size={16} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white">{stats.total}</span>
            <span className="text-[10px] text-slate-500 mt-1">Total pending and active</span>
          </div>
        </div>

        {/* Processing */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-3">
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase">Fulfillment</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white">{stats.processing}</span>
            <span className="text-[10px] text-slate-500 mt-1">Currently processing</span>
          </div>
        </div>

        {/* Shipped */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-3">
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase">In Transit</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Truck size={16} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white">{stats.shipped}</span>
            <span className="text-[10px] text-slate-500 mt-1">In transit with carrier</span>
          </div>
        </div>

        {/* Delivered */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-3">
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase">Delivered</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white">{stats.delivered}</span>
            <span className="text-[10px] text-slate-500 mt-1">Delivered successfully</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center glass-card p-4 rounded-xl border border-slate-900 bg-slate-900/30">
        <div className="flex gap-2 flex-wrap">
          {["ALL", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === s ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20" : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              {s}
            </button>
          ))}
        </div>
        
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, zip, state, name..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-rose-500 text-slate-350 placeholder-slate-600"
          />
          <Search className="absolute left-3 top-2.5 text-slate-600" size={14} />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
          <p className="text-xs text-slate-500">Retrieving shipping pipeline...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl p-8 border border-slate-800 bg-slate-900/10">
          <AlertTriangle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-slate-400 uppercase">No Orders Found</h3>
          <p className="text-xs text-slate-500 mt-1">Modify your search query or check the status tabs.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filtered.map((order) => {
            const hasShiprocket = order.shiprocketShipmentId;
            const hasAwb = order.awbNumber;
            const rates = shiprocketRates[order.id] || [];
            
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
                className="glass-card rounded-2xl p-6 border border-slate-850/80 flex flex-col gap-5 bg-slate-950/20 hover:border-slate-800 transition-all"
              >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-900">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-rose-400">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusColors[order.status] || "text-slate-400 bg-slate-900 border-slate-800"}`}>
                      {order.status}
                    </span>
                    <span className="text-[10px] text-slate-500">{dateStr}</span>
                  </div>
                  <div className="text-sm font-black text-rose-500">₹{order.total.toFixed(2)}</div>
                </div>

                {/* 3-Column Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
                  {/* Customer */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Customer Details</span>
                    <div className="flex flex-col bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 h-full">
                      <span className="font-bold text-white text-sm">{order.user.name}</span>
                      <span className="text-slate-450 mt-1">{order.user.email}</span>
                      {order.address.phone && (
                        <a 
                          href={`tel:${order.address.phone}`} 
                          className="text-rose-400 hover:text-rose-300 font-semibold mt-2.5 flex items-center gap-1.5 self-start"
                        >
                          <Phone size={11} /> {order.address.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Ship To */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Shipping Destination</span>
                    <div className="flex flex-col bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 h-full">
                      <span className="font-bold text-slate-200">{order.address.name}</span>
                      <span className="text-slate-450 mt-1">{order.address.street}</span>
                      <span className="text-slate-450">{order.address.city}, {order.address.state} - {order.address.pincode}</span>
                      {order.latitude && (
                        <a 
                          href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-rose-450 hover:text-rose-300 font-semibold mt-2.5 flex items-center gap-1.5 self-start"
                        >
                          <MapPin size={11} /> Open in Google Maps <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">SKUs In Shipment</span>
                    <div className="flex flex-col bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 h-full">
                      <ul className="flex flex-col gap-1.5">
                        {order.items.map((item) => (
                          <li key={item.id} className="text-slate-350 text-[11px] leading-tight">
                            <strong>{item.variant.product.name}</strong> 
                            <span className="text-rose-400"> × {item.quantity}</span>
                            {(item.variant.color || item.variant.size) && (
                              <span className="text-slate-500 block text-[10px]">
                                {item.variant.color && `Color: ${item.variant.color}`}
                                {item.variant.color && item.variant.size && " | "}
                                {item.variant.size && `Size: ${item.variant.size}`}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Shiprocket Fulfillment Hub Section */}
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck size={12} /> Shiprocket Logistics Center
                    </span>
                    {hasShiprocket && (
                      <span className="text-[10px] text-slate-500">Order linked successfully</span>
                    )}
                  </div>

                  {/* 1. Push Order & Get rates */}
                  {!hasShiprocket && !rates.length && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <p className="text-xs text-slate-500 max-w-lg leading-normal">
                        This pushes delivery details, buyer profile, and skincare package dimensions directly to the Shiprocket API to verify serviceability and fetch real-time courier rates.
                      </p>
                      <button 
                        onClick={() => pushToShiprocket(order.id)}
                        disabled={loadingShiprocket[order.id] || updating === order.id}
                        className="flex-shrink-0 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-750 hover:to-rose-800 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all glow-btn"
                      >
                        {loadingShiprocket[order.id] ? "Connecting Shiprocket API..." : "Link Order & Check Rates"}
                      </button>
                    </div>
                  )}

                  {loadingShiprocket[order.id] && (
                    <div className="flex items-center gap-2 text-xs text-rose-450 py-1 font-semibold">
                      <RefreshCw size={12} className="animate-spin" /> Fetching available courier routes and transit estimates...
                    </div>
                  )}

                  {/* 2. Select courier and book */}
                  {rates.length > 0 && !hasAwb && (
                    <div className="flex flex-col gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                      <div className="text-xs font-bold text-slate-300">Select Serviceable Courier Partner:</div>
                      <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-2">
                        {rates.map((c) => (
                          <label 
                            key={c.courier_company_id} 
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${selectedCouriers[order.id] === String(c.courier_company_id) ? "border-rose-550/80 bg-rose-950/10 text-white" : "border-slate-850 bg-slate-950/20 text-slate-400 hover:border-slate-800"}`}
                          >
                            <div className="flex items-center gap-3 text-xs">
                              <input 
                                type="radio" 
                                name={`courier-${order.id}`} 
                                value={c.courier_company_id}
                                checked={selectedCouriers[order.id] === String(c.courier_company_id)}
                                onChange={e => setSelectedCouriers(p => ({ ...p, [order.id]: e.target.value }))}
                                className="accent-rose-500 w-3.5 h-3.5"
                              />
                              <div className="flex flex-col">
                                <span className="font-bold">{c.courier_name}</span>
                                <span className="text-[10px] text-slate-500 mt-0.5">Estimated Delivery: {c.etd}</span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-rose-450">₹{c.rate.toFixed(2)}</span>
                          </label>
                        ))}
                      </div>

                      <div className="flex gap-2.5 border-t border-slate-900 pt-3">
                        <button
                          onClick={() => bookShiprocketCourier(order.id)}
                          disabled={updating === order.id}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2 px-4 rounded-lg transition-colors"
                        >
                          {updating === order.id ? "Assigning AWB..." : "Confirm Booking & Assign AWB"}
                        </button>
                        <button
                          onClick={() => setShiprocketRates(p => { const clone = { ...p }; delete clone[order.id]; return clone; })}
                          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs py-2 px-4 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. Display metadata and label download */}
                  {hasShiprocket && (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3.5 text-[11px] text-slate-450">
                      <div>Shiprocket Order ID: <strong className="text-slate-300 font-mono">{order.shiprocketOrderId}</strong></div>
                      <div>Shipment ID: <strong className="text-slate-300 font-mono">{order.shiprocketShipmentId}</strong></div>
                      {hasAwb && (
                        <>
                          <div>Courier Partner: <strong className="text-slate-300">{order.courierName}</strong></div>
                          <div className="text-emerald-450 font-bold bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            AWB: <span className="font-mono">{order.awbNumber}</span>
                          </div>
                          {order.shippingLabelUrl && (
                            <a 
                              href={order.shippingLabelUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline ml-auto"
                            >
                              <FileText size={12} /> Download PDF Shipping Label 📄
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Fulfillment Updates & Confirm Delivery */}
                <div className="border-t border-slate-900 pt-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-end justify-between">
                  {/* Status controls */}
                  {NEXT_STATUS[order.status] ? (
                    <div className="flex-1 flex flex-col gap-3">
                      {order.status === "SHIPPED" ? (
                        /* Huge Confirm Delivery Button */
                        <div className="flex flex-col gap-1.5 w-full">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Logistics Operations Action:</span>
                          <button
                            onClick={() => updateOrder(order.id, "DELIVERED")}
                            disabled={updating === order.id}
                            className="w-full sm:max-w-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-905/10"
                          >
                            <CheckSquare size={16} /> Confirm Delivery & Notify Buyer ✅
                          </button>
                        </div>
                      ) : (
                        /* Stepper updates for Processing & Shipped */
                        <div className="flex flex-wrap items-end gap-3.5">
                          {order.status === "PROCESSING" && (
                            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Courier Airway Bill (AWB) / Tracking #</label>
                              <input 
                                value={trackingInputs[order.id] || order.trackingNumber || ""} 
                                onChange={e => setTrackingInputs(p => ({ ...p, [order.id]: e.target.value }))} 
                                placeholder="e.g. BlueDart 729103984" 
                                className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-rose-500 w-full" 
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Fulfillment Notes</label>
                            <input 
                              value={notesInputs[order.id] || order.shippingNotes || ""} 
                              onChange={e => setNotesInputs(p => ({ ...p, [order.id]: e.target.value }))} 
                              placeholder="e.g. Handed to cargo, delay expected" 
                              className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-rose-500 w-full" 
                            />
                          </div>
                          <button 
                            onClick={() => updateOrder(order.id, NEXT_STATUS[order.status])} 
                            disabled={updating === order.id} 
                            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs py-2 px-4 rounded-lg transition-colors whitespace-nowrap self-end"
                          >
                            {updating === order.id ? "Updating..." : `Mark as ${NEXT_STATUS[order.status]}`}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Final status view */
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-450 bg-emerald-950/10 border border-emerald-900/30 px-3.5 py-2 rounded-xl">
                      <CheckCircle size={14} /> Delivered successfully and customer notifications sent.
                    </div>
                  )}

                  {/* Backwards compatibility tracking info */}
                  {order.trackingNumber && !hasAwb && (
                    <div className="text-[11px] text-slate-450 bg-slate-900/30 border border-slate-850 px-3 py-2 rounded-xl flex items-center gap-2">
                      <span>Tracking: <strong className="text-slate-300">{order.trackingNumber}</strong></span>
                      {order.shippingNotes && <span className="text-slate-550">| Note: {order.shippingNotes}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
