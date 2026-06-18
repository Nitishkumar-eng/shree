"use client";
import { useEffect, useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#854d0e",
  CONFIRMED: "#166534",
  PROCESSING: "#1e40af",
  SHIPPED: "#7e22ce",
  DELIVERED: "#065f46",
  CANCELLED: "#991b1b",
};
const STATUS_BG: Record<string, string> = {
  PENDING: "#fef9c3",
  CONFIRMED: "#dcfce7",
  PROCESSING: "#dbeafe",
  SHIPPED: "#f3e8ff",
  DELIVERED: "#d1fae5",
  CANCELLED: "#fee2e2",
};

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
  user: { name: string; email: string; phone?: string };
  address: { name: string; street: string; city: string; state: string; pincode: string; phone: string };
  items: { id: string; quantity: number; priceAtPurchase: number; variant: { color?: string; size?: string; product: { name: string } } }[];
}

export default function ShipperPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [notesInputs, setNotesInputs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    setLoading(true);
    const res = await fetch("/api/shipper/orders");
    if (res.ok) { const data = await res.json(); setOrders(data.orders || []); }
    setLoading(false);
  }

  async function updateOrder(orderId: string, status: string) {
    setUpdating(orderId);
    await fetch("/api/shipper/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status, trackingNumber: trackingInputs[orderId], shippingNotes: notesInputs[orderId] }),
    });
    await fetchOrders();
    setUpdating(null);
  }

  const NEXT_STATUS: Record<string, string> = {
    CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "DELIVERED",
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
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "Total Orders", value: stats.total, icon: "📦", color: "#e11d48" },
          { label: "Processing", value: stats.processing, icon: "⚙️", color: "#1e40af" },
          { label: "Shipped", value: stats.shipped, icon: "🚚", color: "#7e22ce" },
          { label: "Delivered", value: stats.delivered, icon: "✅", color: "#065f46" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff0f6", borderRadius: "16px", padding: "20px", border: "1px solid #fbcfe8", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "6px" }}>{s.icon}</div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "13px", color: "#7c3048", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["ALL", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: "8px 20px", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", background: filter === s ? "#e11d48" : "#fce7f3", color: filter === s ? "#fff" : "#be185d", transition: "all 0.2s" }}>{s}</button>
          ))}
        </div>
        <div style={{ flex: "1", maxWidth: "350px", minWidth: "200px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Search City, Pincode, State or Name..."
            style={{ width: "100%", padding: "8px 16px", borderRadius: "999px", border: "1px solid #fbcfe8", fontSize: "13px", outline: "none", color: "#881337", boxSizing: "border-box" }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#be185d", fontSize: "18px" }}>Loading orders... 🌸</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#9c4060", background: "#fff0f6", borderRadius: "16px", border: "1px solid #fbcfe8" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <p>No orders found matching the filter or search term.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filtered.map(order => (
            <div key={order.id} style={{ background: "#fff0f6", borderRadius: "16px", border: "1px solid #fbcfe8", overflow: "hidden", boxShadow: "0 2px 12px rgba(225,29,72,0.05)" }}>
              {/* Order Header */}
              <div style={{ background: "linear-gradient(135deg,#fce7f3,#fdf2f8)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span style={{ fontWeight: 800, color: "#e11d48", fontSize: "15px" }}>#{order.id.slice(0, 8).toUpperCase()}</span>
                  <span style={{ marginLeft: "12px", background: STATUS_BG[order.status] || "#f3f4f6", color: STATUS_COLORS[order.status] || "#374151", padding: "3px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 700 }}>{order.status}</span>
                </div>
                <div style={{ fontSize: "13px", color: "#7c3048" }}>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                <div style={{ fontWeight: 800, color: "#e11d48", fontSize: "18px" }}>₹{order.total.toFixed(2)}</div>
              </div>

              <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                {/* Customer */}
                <div>
                  <h4 style={{ margin: "0 0 10px", color: "#be185d", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>👤 Customer</h4>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#1f0a10" }}>{order.user.name}</p>
                  <p style={{ margin: "0 0 2px", fontSize: "13px", color: "#5c2033" }}>{order.user.email}</p>
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    <a href={`tel:${order.address.phone}`} style={{ color: "#e11d48", fontWeight: 700, textDecoration: "none" }}>
                      📞 {order.address.phone}
                    </a>
                  </p>
                </div>

                {/* Shipping Address */}
                <div>
                  <h4 style={{ margin: "0 0 10px", color: "#be185d", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>📍 Ship To</h4>
                  <p style={{ margin: "0 0 2px", fontWeight: 600, color: "#1f0a10", fontSize: "13px" }}>{order.address.name}</p>
                  <p style={{ margin: "0 0 2px", fontSize: "13px", color: "#5c2033" }}>{order.address.street}</p>
                  <p style={{ margin: "0 0 2px", fontSize: "13px", color: "#5c2033" }}>{order.address.city}, {order.address.state}</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#5c2033" }}>PIN: {order.address.pincode}</p>
                  {order.latitude && (
                    <a href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "#e11d48", fontWeight: 600, display: "inline-block", marginTop: "6px" }}>🗺️ View on Maps</a>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h4 style={{ margin: "0 0 10px", color: "#be185d", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>🧴 Items</h4>
                  {order.items.map(item => (
                    <div key={item.id} style={{ fontSize: "13px", color: "#3b1121", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600 }}>{item.variant.product.name}</span>
                      <span style={{ color: "#9c4060" }}> × {item.quantity}</span>
                      {item.variant.color && <span style={{ color: "#7c3048" }}> ({item.variant.color})</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking & Update */}
              {NEXT_STATUS[order.status] && (
                <div style={{ padding: "16px 20px", background: "#fce7f3", borderTop: "1px solid #fbcfe8", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: 1, minWidth: "180px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#be185d", display: "block", marginBottom: "6px" }}>Tracking Number</label>
                    <input value={trackingInputs[order.id] || order.trackingNumber || ""} onChange={e => setTrackingInputs(p => ({ ...p, [order.id]: e.target.value }))} placeholder="e.g. DTDC1234567" style={{ width: "100%", padding: "8px 12px", border: "1px solid #fbcfe8", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 2, minWidth: "220px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#be185d", display: "block", marginBottom: "6px" }}>Notes (optional)</label>
                    <input value={notesInputs[order.id] || order.shippingNotes || ""} onChange={e => setNotesInputs(p => ({ ...p, [order.id]: e.target.value }))} placeholder="Delivery notes..." style={{ width: "100%", padding: "8px 12px", border: "1px solid #fbcfe8", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
                  </div>
                  <button onClick={() => updateOrder(order.id, NEXT_STATUS[order.status])} disabled={updating === order.id} style={{ background: "linear-gradient(135deg,#e11d48,#be185d)", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "999px", fontWeight: 700, cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap", opacity: updating === order.id ? 0.7 : 1 }}>
                    {updating === order.id ? "Updating..." : `Mark as ${NEXT_STATUS[order.status]} 🚀`}
                  </button>
                </div>
              )}

              {order.trackingNumber && (
                <div style={{ padding: "10px 20px", background: "#dbeafe", borderTop: "1px solid #bfdbfe", fontSize: "13px", color: "#1e40af" }}>
                  📦 Tracking: <strong>{order.trackingNumber}</strong>
                  {order.shippingNotes && <span style={{ marginLeft: "16px", color: "#1e3a8a" }}>Note: {order.shippingNotes}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
