"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/Providers";
import { formatINR } from "@/lib/gst";
import { 
  Tag, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Calendar,
  AlertTriangle 
} from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discountType: "FLAT" | "PERCENT";
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiry: string;
  isActive: boolean;
}

export default function AdminCouponsPage() {
  const { toast } = useToast();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENT">("PERCENT");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiry, setExpiry] = useState("");

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data);
      }
    } catch (err) {
      console.error(err);
      toast("Error loading coupons list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  // Add coupon submit handler
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !value || !minOrder || !maxUses || !expiry) {
      toast("Please enter all required coupon details", "error");
      return;
    }

    const valueNum = parseFloat(value);
    const minOrderNum = parseFloat(minOrder);
    const maxUsesNum = parseInt(maxUses);

    if (valueNum <= 0 || minOrderNum < 0 || maxUsesNum < 1) {
      toast("Please enter valid positive coupon attributes", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountType,
          value: valueNum,
          minOrder: minOrderNum,
          maxUses: maxUsesNum,
          expiry,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast("Promo coupon created successfully", "success");
        setCode("");
        setValue("");
        setMinOrder("");
        setMaxUses("");
        setExpiry("");
        setShowAddForm(false);
        loadCoupons();
      } else {
        toast(data.error || "Failed to create coupon", "error");
      }
    } catch {
      toast("Network error occurred", "error");
    }
  };

  // Toggle active status
  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: coupon.id,
          isActive: !coupon.isActive,
        }),
      });

      if (res.ok) {
        toast(`Coupon status updated successfully`, "success");
        loadCoupons();
      } else {
        toast("Failed to update status", "error");
      }
    } catch {
      toast("An error occurred", "error");
    }
  };

  // Delete coupon
  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast("Coupon deleted successfully", "success");
        loadCoupons();
      } else {
        toast("Delete request failed", "error");
      }
    } catch {
      toast("Network error occurred", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-10 items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-500">Loading coupons...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Tag className="text-indigo-400" /> Platform Coupons
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure active customer promo codes, discount percentages, and minimum order requirements</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all flex items-center gap-1.5 glow-btn"
        >
          <Plus size={14} /> Add Coupon
        </button>
      </div>

      {/* Entry creation Form */}
      {showAddForm && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
          <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">Create New Promo Coupon</span>
          <form onSubmit={handleAddCoupon} className="flex flex-col gap-4 text-slate-350 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MONSOON20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-200 uppercase"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Discount Type *</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-300"
                >
                  <option value="PERCENT">Percent Off (%)</option>
                  <option value="FLAT">Flat Rate Off (₹)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Value *</label>
                <input
                  type="number"
                  required
                  placeholder={discountType === "PERCENT" ? "e.g. 10 for 10%" : "e.g. 500 for ₹500"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Min. Order Total (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1999"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Max Uses limit *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 100"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-300"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="py-2 px-4 rounded-xl text-xs bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-6 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
              >
                Create Coupon
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons Table view list */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400 border-collapse">
          <thead>
            <tr className="border-b border-slate-850 text-slate-500 uppercase text-[9px] tracking-wider">
              <th className="py-3 px-4">Coupon Code</th>
              <th className="py-3 px-4">Discount Value</th>
              <th className="py-3 px-4">Min Order Threshold</th>
              <th className="py-3 px-4 text-center">Fulfillment Usage</th>
              <th className="py-3 px-4">Expires</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Delete</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  No coupons configured. Click "Add Coupon" to create one.
                </td>
              </tr>
            ) : (
              coupons.map((c) => {
                const isExpired = new Date(c.expiry) < new Date();
                const expDateStr = new Date(c.expiry).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <tr key={c.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/10 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-slate-200 text-sm tracking-wider">{c.code}</td>
                    <td className="py-4 px-4 text-slate-300 font-semibold">
                      {c.discountType === "PERCENT" ? `${c.value}% OFF` : `${formatINR(c.value)} OFF`}
                    </td>
                    <td className="py-4 px-4 text-slate-400">{formatINR(c.minOrder)}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-slate-400 font-semibold">{c.usedCount}</span>
                      <span className="text-slate-600"> / {c.maxUses} uses</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={12} className="text-slate-650" />
                        <span className={isExpired ? "text-rose-400 line-through" : ""}>{expDateStr}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-[9px] font-bold border transition-colors ${c.isActive && !isExpired ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-950/40" : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800/80"}`}
                        title="Click to toggle status"
                      >
                        {c.isActive && !isExpired ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
