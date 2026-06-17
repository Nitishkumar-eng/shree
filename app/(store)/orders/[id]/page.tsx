"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/Providers";
import { formatINR } from "@/lib/gst";
import { 
  History, 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  Clock, 
  Truck, 
  Package, 
  XOctagon,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";

interface OrderItem {
  id: string;
  quantity: number;
  priceAtPurchase: number;
  gstRate: number;
  hsnCode: string | null;
  variant: {
    size: string | null;
    color: string | null;
    images: string[];
    product: {
      name: string;
      brand: string;
    };
  };
}

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
  couponCode: string | null;
  createdAt: string;
  address: {
    name: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  items: OrderItem[];
  payments: Payment[];
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isSuccess = searchParams.get("success") === "true";

  // Fetch order details
  const fetchOrderDetails = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        toast("Failed to load order information", "error");
        router.push("/orders");
      }
    } catch {
      toast("Connection error", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchOrderDetails();
    }
  }, [session, params.id]);

  // Fire confetti on success
  useEffect(() => {
    if (isSuccess && !loading && order) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#4f46e5", "#10b981", "#ffffff"],
      });
      // Clear the query parameter so it doesn't refire
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.toString());
    }
  }, [isSuccess, loading, order]);

  // Cancel order handler
  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order? This cannot be undone.")) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (res.ok) {
        toast("Order cancelled successfully", "success");
        fetchOrderDetails();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to cancel order", "error");
      }
    } catch {
      toast("Error processing request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Request return handler
  const handleRequestReturn = async () => {
    if (!window.confirm("Do you want to request a return for this order?")) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RETURN_REQUESTED" }),
      });

      if (res.ok) {
        toast("Return request submitted successfully", "success");
        fetchOrderDetails();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to request return", "error");
      }
    } catch {
      toast("Error processing request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-10 items-center justify-center min-h-[55vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-500">Retrieving order details...</p>
      </div>
    );
  }

  if (!order) return null;

  const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const timelineSteps = [
    { label: "Pending Payment", status: "PENDING", icon: Clock },
    { label: "Confirmed", status: "CONFIRMED", icon: CheckCircle },
    { label: "Processing", status: "PROCESSING", icon: Package },
    { label: "Shipped", status: "SHIPPED", icon: Truck },
    { label: "Delivered", status: "DELIVERED", icon: CheckCircle },
  ];

  const currentStepIdx = timelineSteps.findIndex((s) => s.status === order.status);

  return (
    <div className="flex flex-col gap-8 py-4">
      {/* Back & Invoice triggers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Link href="/orders" className="text-slate-500 hover:text-indigo-400 p-1.5 rounded-lg border border-slate-800 bg-slate-900/30 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Order Details
            </h1>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {order.id.toUpperCase()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Download invoice */}
          <a
            href={`/api/orders/${order.id}/invoice`}
            download
            className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Download size={14} /> Download PDF Invoice
          </a>
        </div>
      </div>

      {/* Success banner if redirected */}
      {isSuccess && (
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 flex flex-col gap-1 items-center text-center">
          <CheckCircle className="w-8 h-8 mb-1" />
          <h3 className="font-bold text-sm">Thank You for Your Order!</h3>
          <p className="text-[11px] text-emerald-500/80">Your payment has been successfully verified. An order confirmation email with your attached GST tax invoice has been sent.</p>
        </div>
      )}

      {/* Timeline Progression Indicator */}
      {order.status !== "CANCELLED" && order.status !== "REFUNDED" && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Order Status Timeline</span>
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0 mt-2">
            {/* Horizontal Line connector */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-850 z-0 hidden md:block"></div>
            {timelineSteps.map((step, idx) => {
              const StepIcon = step.icon;
              const isCompleted = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={idx} className="flex md:flex-col items-center gap-3 md:gap-2 z-10 md:w-1/5 text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${isCompleted ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                    <StepIcon size={14} />
                  </div>
                  <div className="flex flex-col items-start md:items-center">
                    <span className={`text-xs font-semibold ${isCompleted ? "text-slate-200" : "text-slate-500"} ${isCurrent ? "text-indigo-400" : ""}`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancelled Warning banner */}
      {order.status === "CANCELLED" && (
        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-950/20 text-rose-400 flex gap-3 items-center">
          <XOctagon size={24} className="flex-shrink-0" />
          <div className="text-xs">
            <h4 className="font-bold">This Order Has Been Cancelled</h4>
            <p className="text-slate-400 mt-0.5">Inventory items have been returned to active stock. If payment was made, refunds are processed within 3-5 business days.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column: Items table, Payment Info, Shipping address */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Purchased Items details */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Ordered Items</span>
            <div className="flex flex-col gap-4">
              {order.items.map((item) => {
                const image = item.variant.images.length ? item.variant.images[0] : "";
                const taxable = item.priceAtPurchase / (1 + item.gstRate / 100);
                const taxAmt = item.priceAtPurchase - taxable;

                return (
                  <div key={item.id} className="flex items-center justify-between border-b border-slate-900/40 pb-4 last:border-0 last:pb-0">
                    <div className="flex gap-4 items-center flex-1">
                      <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0">
                        <img src={image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold text-slate-500">{item.variant.product.brand}</span>
                        <h4 className="font-bold text-xs text-slate-200 line-clamp-1">{item.variant.product.name}</h4>
                        <div className="flex gap-2 text-[10px] text-slate-500 font-semibold mt-0.5">
                          {item.variant.size && <span>Size: {item.variant.size}</span>}
                          {item.variant.color && <span>Color: {item.variant.color}</span>}
                          {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right pl-4 flex-shrink-0">
                      <span className="text-xs font-bold text-white block">₹{item.priceAtPurchase.toFixed(2)} x {item.quantity}</span>
                      <span className="text-[9px] text-slate-500">Taxable: ₹{(taxable * item.quantity).toFixed(2)} | GST ({item.gstRate}%): ₹{(taxAmt * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery & Payment details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Delivery address details */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-2">
              <span className="text-[10px] font-extrabold tracking-wider text-indigo-400 uppercase">Shipping Address</span>
              <span className="font-bold text-sm text-slate-200 mt-1">{order.address.name}</span>
              <p className="text-xs text-slate-400 leading-relaxed">{order.address.street}, {order.address.city}, {order.address.state} - {order.address.pincode}</p>
              <span className="text-[10px] text-slate-500 font-semibold mt-2">Mobile: {order.address.phone}</span>
            </div>

            {/* Payment Details */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col gap-2 justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-indigo-400 uppercase">Payment Summary</span>
                <div className="flex flex-col gap-1 mt-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-slate-300">
                      {order.payments.length ? order.payments[0].status : "PENDING"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Method:</span>
                    <span className="font-bold text-slate-300">
                      {order.payments.length ? (order.payments[0].method || "ONLINE") : "N/A"}
                    </span>
                  </div>
                  {order.payments.length && order.payments[0].razorpayPaymentId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment ID:</span>
                      <span className="font-mono text-[9px] font-bold text-slate-400 truncate max-w-[120px]">
                        {order.payments[0].razorpayPaymentId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-[9px] text-slate-500 mt-4">
                Placed on: {dateStr}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Price details summary & cancel buttons */}
        <div className="flex flex-col gap-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/80 pb-3">Order Totals</span>
            
            <div className="flex flex-col gap-2.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Taxable Value (Pre-tax)</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Calculated GST Tax</span>
                <span>{formatINR(order.gstAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Delivery Fee</span>
                <span>{formatINR(order.delivery)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-indigo-400">
                  <span>Coupon Discount Applied</span>
                  <span>-{formatINR(order.discount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-4 flex justify-between items-baseline">
              <span className="text-sm font-bold text-white">Net Total Amount</span>
              <span className="text-xl font-black text-indigo-400">{formatINR(order.total)}</span>
            </div>

            {/* Actions for customer */}
            <div className="flex flex-col gap-2 mt-4">
              {(order.status === "PENDING" || order.status === "CONFIRMED") && (
                <button
                  onClick={handleCancelOrder}
                  disabled={actionLoading}
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-850 text-rose-400 font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  Cancel Order
                </button>
              )}

              {order.status === "DELIVERED" && (
                <button
                  onClick={handleRequestReturn}
                  disabled={actionLoading}
                  className="w-full bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400 font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  Request Return
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
