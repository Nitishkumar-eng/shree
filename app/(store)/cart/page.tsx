"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Providers";
import { formatINR } from "@/lib/gst";
import { ShoppingBag, Trash2, ArrowRight, Sparkles, Tag, Plus, Minus, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface CartItem {
  id?: string;
  productVariantId: string;
  quantity: number;
  variant: {
    id: string;
    size: string | null;
    color: string | null;
    price: number;
    mrp: number;
    stockQuantity: number;
    images: string[];
    product: {
      id: string;
      name: string;
      brand: string;
      gstRate: number;
    };
  };
}

export default function CartPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Coupon promo code states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");

  // Fetch cart items
  const fetchCart = async () => {
    setLoading(true);
    if (!session) {
      // Guest Cart from localStorage
      try {
        const guestCart = JSON.parse(localStorage.getItem("dewkit-guest-cart") || "[]");
        // Convert guest structure to standard model structure
        const formatted: CartItem[] = guestCart.map((i: any) => ({
          productVariantId: i.productVariantId,
          quantity: i.quantity,
          variant: {
            id: i.productVariantId,
            size: i.size,
            color: i.color,
            price: i.price,
            mrp: i.mrp || i.price * 1.25,
            stockQuantity: i.stockQuantity || 10,
            images: [i.image],
            product: {
              id: i.productId || "1",
              name: i.name,
              brand: i.brand,
              gstRate: i.gstRate || 18,
            },
          },
        }));
        setCartItems(formatted);
      } catch {
        setCartItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Authenticated cart from DB
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setCartItems(data);
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load shopping cart", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [session]);

  // Merge guest cart on login
  useEffect(() => {
    const mergeGuestCart = async () => {
      if (session) {
        const guestCart = JSON.parse(localStorage.getItem("dewkit-guest-cart") || "[]");
        if (guestCart.length > 0) {
          try {
            const res = await fetch("/api/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                isMerge: true,
                items: guestCart.map((i: any) => ({
                  productVariantId: i.productVariantId,
                  quantity: i.quantity,
                })),
              }),
            });
            if (res.ok) {
              localStorage.removeItem("dewkit-guest-cart");
              toast("Merged guest items into your account cart", "success");
              fetchCart();
            }
          } catch (e) {
            console.error("Cart merge error:", e);
          }
        }
      }
    };

    mergeGuestCart();
  }, [session]);

  // Update Cart Quantity
  const handleUpdateQuantity = async (variantId: string, newQty: number, maxStock: number) => {
    if (newQty < 1 || newQty > maxStock) return;

    if (!session) {
      // Guest state updates
      try {
        const guestCart = JSON.parse(localStorage.getItem("dewkit-guest-cart") || "[]");
        const idx = guestCart.findIndex((i: any) => i.productVariantId === variantId);
        if (idx > -1) {
          guestCart[idx].quantity = newQty;
          localStorage.setItem("dewkit-guest-cart", JSON.stringify(guestCart));
          window.dispatchEvent(new Event("dewkit-cart-update"));
          fetchCart();
        }
      } catch {
        toast("Failed to update item", "error");
      }
      return;
    }

    try {
      const res = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId: variantId, quantity: newQty }),
      });
      if (res.ok) {
        fetchCart();
        window.dispatchEvent(new Event("dewkit-cart-update"));
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update quantity", "error");
      }
    } catch {
      toast("Error updating item", "error");
    }
  };

  // Remove Item
  const handleRemoveItem = async (variantId: string) => {
    if (!session) {
      // Guest remove
      try {
        const guestCart = JSON.parse(localStorage.getItem("dewkit-guest-cart") || "[]");
        const filtered = guestCart.filter((i: any) => i.productVariantId !== variantId);
        localStorage.setItem("dewkit-guest-cart", JSON.stringify(filtered));
        window.dispatchEvent(new Event("dewkit-cart-update"));
        toast("Removed item from cart", "success");
        fetchCart();
      } catch {
        toast("Failed to remove item", "error");
      }
      return;
    }

    try {
      const res = await fetch(`/api/cart?productVariantId=${variantId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCart();
        window.dispatchEvent(new Event("dewkit-cart-update"));
        toast("Removed item from cart", "success");
      } else {
        toast("Failed to remove item", "error");
      }
    } catch {
      toast("Error removing item", "error");
    }
  };

  // Coupon check dispatcher
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");

    if (!session) {
      toast("Please sign in to apply coupon codes", "info");
      router.push("/login?callbackUrl=/cart");
      return;
    }

    if (!couponCode.trim()) return;

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          orderAmount: finalPriceDetails.itemsPriceTotal,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAppliedCoupon(data);
        toast("Coupon applied successfully!", "success");
      } else {
        setCouponError(data.error || "Invalid coupon");
        setAppliedCoupon(null);
      }
    } catch {
      toast("Failed to process coupon request", "error");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  // Calculate pricing lists
  const calculateTotals = () => {
    let mrpTotal = 0;
    let itemsPriceTotal = 0; // Price paid inclusive of tax
    let totalTaxableValue = 0;
    let totalGstAmount = 0;

    cartItems.forEach((item) => {
      const price = item.variant.price;
      const mrp = item.variant.mrp || price * 1.25;
      const gstRate = item.variant.product.gstRate;
      
      const qty = item.quantity;
      const taxable = price / (1 + gstRate / 100);
      const taxAmt = price - taxable;

      mrpTotal += mrp * qty;
      itemsPriceTotal += price * qty;
      totalTaxableValue += taxable * qty;
      totalGstAmount += taxAmt * qty;
    });

    let couponDiscount = 0;
    if (appliedCoupon) {
      couponDiscount = appliedCoupon.discountAmount;
    }

    // Free delivery threshold: ₹1500
    const deliveryCharge = itemsPriceTotal >= 1500 || itemsPriceTotal === 0 ? 0 : 59;
    const finalTotal = itemsPriceTotal + deliveryCharge - couponDiscount;

    return {
      mrpTotal,
      itemsPriceTotal,
      totalTaxableValue,
      totalGstAmount,
      deliveryCharge,
      couponDiscount,
      finalTotal,
    };
  };

  const finalPriceDetails = calculateTotals();

  const handleCheckoutRedirect = () => {
    if (!session) {
      toast("Please sign in to proceed with checkout", "info");
      router.push("/login?callbackUrl=/checkout");
    } else {
      router.push("/checkout");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-10 items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-500">Syncing shopping bag items...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShoppingBag className="text-indigo-400" /> Shopping Bag
        </h1>
        <p className="text-xs text-slate-500 mt-1">Review your selections and apply any promotional codes before checking out</p>
      </div>

      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl p-8 border border-slate-800">
          <ShoppingBag className="w-16 h-16 text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Your shopping bag is empty</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">Looks like you haven't added any products to your cart yet. Visit our collections to find items.</p>
          <Link
            href="/products"
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl text-xs transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Cart Items List */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {cartItems.map((item) => {
              const image = item.variant.images.length
                ? item.variant.images[0]
                : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60";

              return (
                <div
                  key={item.productVariantId}
                  className="glass-card rounded-2xl p-4 flex gap-4 border border-slate-800/80 items-center justify-between"
                >
                  <div className="flex gap-4 items-center flex-1">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
                      <img src={image} alt={item.variant.product.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[9px] uppercase font-bold text-slate-500">{item.variant.product.brand}</span>
                      <h3 className="font-bold text-sm text-slate-200 line-clamp-1">{item.variant.product.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                        {item.variant.size && <span>Size: {item.variant.size}</span>}
                        {item.variant.size && item.variant.color && <span className="text-slate-700">|</span>}
                        {item.variant.color && <span>Color: {item.variant.color}</span>}
                      </div>
                      
                      {/* Price per item */}
                      <span className="text-xs font-bold text-white mt-1">{formatINR(item.variant.price)}</span>
                    </div>
                  </div>

                  {/* Quantity Controls & Delete */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
                      <button
                        onClick={() => handleUpdateQuantity(item.productVariantId, item.quantity - 1, item.variant.stockQuantity)}
                        className="p-1 hover:text-white text-slate-400 disabled:opacity-30"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="px-2 text-xs font-bold text-white w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.productVariantId, item.quantity + 1, item.variant.stockQuantity)}
                        className="p-1 hover:text-white text-slate-400 disabled:opacity-30"
                        disabled={item.quantity >= item.variant.stockQuantity}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.productVariantId)}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Totals Summary Card */}
          <div className="flex flex-col gap-6">
            {/* Coupon Code Panel */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1 mb-3">
                <Tag size={14} className="text-indigo-400" /> Apply Coupon
              </span>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-950/20 text-indigo-400 text-xs">
                  <div>
                    <span className="font-bold">{appliedCoupon.code}</span> applied! (Saved ₹{appliedCoupon.discountAmount.toFixed(2)})
                  </div>
                  <button onClick={handleRemoveCoupon} className="font-bold underline text-[10px]">Remove</button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. WELCOME10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 uppercase placeholder-slate-600"
                  />
                  <button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
                  >
                    Apply
                  </button>
                </form>
              )}
              {couponError && <p className="text-[10px] text-rose-400 mt-2 font-semibold">✗ {couponError}</p>}
            </div>

            {/* Price details Card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/80 pb-3">Price Summary</span>
              
              <div className="flex flex-col gap-2.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Total MRP (Incl. Taxes)</span>
                  <span className="text-slate-300">{formatINR(finalPriceDetails.mrpTotal)}</span>
                </div>
                
                {finalPriceDetails.mrpTotal > finalPriceDetails.itemsPriceTotal && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Retail discount savings</span>
                    <span>-{formatINR(finalPriceDetails.mrpTotal - finalPriceDetails.itemsPriceTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Subtotal (Before Tax)</span>
                  <span className="text-slate-300">{formatINR(finalPriceDetails.totalTaxableValue)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Total Calculated GST</span>
                  <span className="text-slate-300">{formatINR(finalPriceDetails.totalGstAmount)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Shipping & Delivery Fee</span>
                  {finalPriceDetails.deliveryCharge > 0 ? (
                    <span className="text-slate-300">{formatINR(finalPriceDetails.deliveryCharge)}</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">FREE DELIVERY</span>
                  )}
                </div>

                {finalPriceDetails.couponDiscount > 0 && (
                  <div className="flex justify-between text-indigo-400 font-semibold">
                    <span>Coupon Promo savings</span>
                    <span>-{formatINR(finalPriceDetails.couponDiscount)}</span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="border-t border-slate-800 pt-4 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Grand Total</span>
                <span className="text-xl font-black text-indigo-400">{formatINR(finalPriceDetails.finalTotal)}</span>
              </div>

              {/* Checkout Trigger */}
              <button
                onClick={handleCheckoutRedirect}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 text-xs glow-btn"
              >
                Proceed to Checkout <ArrowRight size={14} />
              </button>

              <div className="flex items-center gap-1.5 justify-center mt-2 text-[10px] text-slate-500">
                <ShieldCheck size={12} className="text-indigo-500" /> Fully secure SSL encrypted transactions
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
