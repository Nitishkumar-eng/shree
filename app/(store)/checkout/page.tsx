"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Providers";
import { formatINR } from "@/lib/gst";
import { checkPincode } from "@/lib/pincodes";
import {
  ShieldCheck,
  MapPin,
  Plus,
  CreditCard,
  Home,
  Phone,
  Tag,
  AlertCircle,
  Truck,
  Smartphone,
  Wifi,
  CheckCircle2,
  Lock,
  X,
  ChevronRight,
  Package,
} from "lucide-react";
import Script from "next/script";

interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

interface CartItem {
  id: string;
  quantity: number;
  variant: {
    price: number;
    product: {
      name: string;
      gstRate: number;
    };
  };
}

type PaymentMethod = "ONLINE" | "CARD" | "COD";

export default function CheckoutPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  // Checkout states
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ONLINE");

  // Address form states
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Location tracking (for admin)
  const [location, setLocation] = useState<{ latitude: number; longitude: number; city?: string; state?: string } | null>(null);

  // ─── UPI Modal States ───────────────────────────────────────
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [upiLoading, setUpiLoading] = useState(false);
  const [upiCurrentOrderId, setUpiCurrentOrderId] = useState("");
  const [upiRazorpayOrderId, setUpiRazorpayOrderId] = useState("");

  // ─── Card Modal States ───────────────────────────────────────
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardFlipped, setCardFlipped] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardCurrentOrderId, setCardCurrentOrderId] = useState("");
  const [cardRazorpayOrderId, setCardRazorpayOrderId] = useState("");

  const loadCheckoutData = async () => {
    if (!session) return;
    setCartLoading(true);
    try {
      const addrRes = await fetch("/api/addresses");
      if (addrRes.ok) {
        const addrList = await addrRes.json();
        setAddresses(addrList);
        const defAddr = addrList.find((a: Address) => a.isDefault);
        if (defAddr) setSelectedAddressId(defAddr.id);
        else if (addrList.length > 0) setSelectedAddressId(addrList[0].id);
      }
      const cartRes = await fetch("/api/cart");
      if (cartRes.ok) {
        const cartList = await cartRes.json();
        setCartItems(cartList);
        if (cartList.length === 0) {
          toast("Your cart is empty. Redirecting...", "info");
          router.push("/cart");
        }
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load checkout details", "error");
    } finally {
      setCartLoading(false);
    }
  };

  useEffect(() => {
    if (session) loadCheckoutData();
  }, [session]);

  // Silent location detection for admin order tracking
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            // Reverse geocode using open API (no key needed)
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            if (res.ok) {
              const data = await res.json();
              const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "";
              const state = data.address?.state || "";
              setLocation({ latitude, longitude, city, state });
            } else {
              setLocation({ latitude, longitude });
            }
          } catch {
            setLocation({ latitude, longitude });
          }
        },
        () => {}, // Silently fail if denied
        { timeout: 8000, enableHighAccuracy: false }
      );
    }
  }, []);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newStreet.trim() || !newCity.trim() || !newState.trim()) {
      toast("Please fill in all address fields", "error");
      return;
    }
    if (!/^\d{6}$/.test(newPincode)) {
      toast("Please enter a valid 6 digit pincode", "error");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(newPhone)) {
      toast("Please enter a valid 10-digit phone number", "error");
      return;
    }
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, street: newStreet, city: newCity, state: newState, pincode: newPincode, phone: newPhone, isDefault: newIsDefault }),
      });
      if (res.ok) {
        toast("New address added successfully", "success");
        setNewName(""); setNewStreet(""); setNewCity(""); setNewState(""); setNewPincode(""); setNewPhone(""); setNewIsDefault(false);
        setShowAddressForm(false);
        loadCheckoutData();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to add address", "error");
      }
    } catch { toast("An error occurred", "error"); }
  };

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const pincodeCheck = selectedAddress ? checkPincode(selectedAddress.pincode) : null;

  const calculateTotals = () => {
    let itemsPriceTotal = 0, totalTaxableValue = 0, totalGstAmount = 0;
    cartItems.forEach((item) => {
      const price = item.variant.price;
      const gstRate = item.variant.product.gstRate;
      const qty = item.quantity;
      const taxable = price / (1 + gstRate / 100);
      const taxAmt = price - taxable;
      itemsPriceTotal += price * qty;
      totalTaxableValue += taxable * qty;
      totalGstAmount += taxAmt * qty;
    });
    const shipping = itemsPriceTotal >= 1500 || itemsPriceTotal === 0 ? 0 : (pincodeCheck?.shippingFee || 59);
    const finalTotal = itemsPriceTotal + shipping - couponDiscount;
    return { itemsPriceTotal, totalTaxableValue, totalGstAmount, shipping, finalTotal };
  };

  const finalTotals = calculateTotals();

  // ─── Core payment flow ────────────────────────────────────────
  const createOrderAndPay = async (): Promise<{ orderId: string; payData: any } | null> => {
    // Step 1: Create order
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressId: selectedAddressId,
        couponCode: couponCode || undefined,
        paymentMethod,
        ...(location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          locationCity: location.city,
          locationState: location.state,
        } : {}),
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      toast(orderData.error || "Failed to initiate order", "error");
      return null;
    }
    if (paymentMethod === "COD") return { orderId: orderData.id, payData: null };

    // Step 2: Create payment
    const payRes = await fetch("/api/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderData.id }),
    });
    const payData = await payRes.json();
    if (!payRes.ok) {
      toast(payData.error || "Failed to create payment transaction", "error");
      return null;
    }
    return { orderId: orderData.id, payData };
  };

  const verifyPayment = async (razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string, orderId: string) => {
    const verifyRes = await fetch("/api/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId }),
    });
    const verifyData = await verifyRes.json();
    if (verifyRes.ok) {
      toast("Payment verified successfully! 🎉", "success");
      router.push(`/orders/${orderId}?success=true`);
    } else {
      toast(verifyData.error || "Payment verification failed", "error");
      router.push(`/orders/${orderId}?payment=failed`);
    }
  };

  const handlePayment = async () => {
    if (!selectedAddressId) { toast("Please select a delivery address", "error"); return; }
    if (pincodeCheck && !pincodeCheck.serviceable) { toast("The selected pincode is not serviceable", "error"); return; }
    setPlacingOrder(true);

    try {
      const result = await createOrderAndPay();
      if (!result) { setPlacingOrder(false); return; }
      const { orderId, payData } = result;

      // COD — direct success
      if (paymentMethod === "COD") {
        toast("Order placed! Pay on delivery 🚚", "success");
        router.push(`/orders/${orderId}?success=true`);
        return;
      }

      // Mock payment — show custom sandbox
      if (payData?.isMockPayment) {
        setPlacingOrder(false);
        if (paymentMethod === "ONLINE") {
          setUpiCurrentOrderId(orderId);
          setUpiRazorpayOrderId(payData.id);
          setShowUpiModal(true);
        } else {
          setCardCurrentOrderId(orderId);
          setCardRazorpayOrderId(payData.id);
          setShowCardModal(true);
        }
        return;
      }

      // Real Razorpay
      const options = {
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: "Dewkit Premium Skincare",
        description: `Order #${orderId.slice(0, 8).toUpperCase()}`,
        order_id: payData.id,
        handler: async (response: any) => {
          await verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature, orderId);
        },
        prefill: { name: session?.user?.name || "", email: session?.user?.email || "", contact: selectedAddress?.phone || "" },
        theme: { color: "#e11d48" },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      rzp.on("payment.failed", (r: any) => { toast("Payment failed: " + r.error.description, "error"); setPlacingOrder(false); });
    } catch (err) {
      console.error(err);
      toast("Failed to process payment. Try again.", "error");
      setPlacingOrder(false);
    }
  };

  // ─── UPI submission ───────────────────────────────────────────
  const handleUpiSubmit = async () => {
    if (!upiId.trim() || !upiId.includes("@")) {
      toast("Please enter a valid UPI ID (e.g., 9876543210@upi)", "error");
      return;
    }
    setUpiLoading(true);
    setTimeout(async () => {
      try {
        await verifyPayment(
          upiRazorpayOrderId,
          "pay_mock_" + Math.random().toString(36).substring(2, 11),
          "mock_upi_sig_" + Math.random().toString(36).substring(2, 11),
          upiCurrentOrderId
        );
        setShowUpiModal(false);
      } catch { toast("UPI verification failed", "error"); }
      finally { setUpiLoading(false); }
    }, 1800);
  };

  // ─── Card submission ─────────────────────────────────────────
  const handleCardSubmit = async () => {
    const cleaned = cardNumber.replace(/\s/g, "");
    if (cleaned.length < 16) { toast("Please enter a valid 16-digit card number", "error"); return; }
    if (!cardName.trim()) { toast("Please enter the cardholder name", "error"); return; }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) { toast("Enter expiry as MM/YY", "error"); return; }
    if (cardCvv.length < 3) { toast("Enter a valid CVV", "error"); return; }
    setCardLoading(true);
    setTimeout(async () => {
      try {
        await verifyPayment(
          cardRazorpayOrderId,
          "pay_mock_" + Math.random().toString(36).substring(2, 11),
          "mock_card_sig_" + Math.random().toString(36).substring(2, 11),
          cardCurrentOrderId
        );
        setShowCardModal(false);
      } catch { toast("Card payment failed", "error"); }
      finally { setCardLoading(false); }
    }, 2000);
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const getCardBrand = () => {
    const n = cardNumber.replace(/\s/g, "");
    if (n.startsWith("4")) return "VISA";
    if (n.startsWith("5") || n.startsWith("2")) return "MASTERCARD";
    if (n.startsWith("37") || n.startsWith("34")) return "AMEX";
    if (n.startsWith("6")) return "RUPAY";
    return "CARD";
  };

  if (cartLoading) {
    return (
      <div className="flex flex-col gap-6 py-10 items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
        <p className="text-xs text-slate-500">Initializing secure checkout...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* ─── UPI Modal ─────────────────────────────────────────────── */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,20,15,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="relative w-full max-w-sm rounded-3xl border border-amber-200/60 shadow-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #faf7f0 0%, #f0e8d8 100%)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/60" style={{ background: "linear-gradient(135deg, #bf2b15 0%, #8a1708 100%)" }}>
              <div className="flex items-center gap-2">
                <Smartphone className="text-white w-5 h-5" />
                <span className="text-white font-bold text-sm">UPI Payment Gateway</span>
              </div>
              <button onClick={() => setShowUpiModal(false)} className="text-white/70 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Amount */}
              <div className="text-center">
                <p className="text-xs text-stone-500 mb-1">Amount to Pay</p>
                <p className="text-3xl font-black" style={{ color: "#bf2b15" }}>{formatINR(finalTotals.finalTotal)}</p>
              </div>

              {/* Animated QR */}
              <div className="relative mx-auto rounded-2xl border-2 border-amber-300/60 overflow-hidden" style={{ width: 180, height: 180, background: "#fff" }}>
                <svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
                  {/* QR pattern blocks */}
                  <rect x="10" y="10" width="50" height="50" rx="6" fill="#1a1210" />
                  <rect x="18" y="18" width="34" height="34" rx="3" fill="white" />
                  <rect x="25" y="25" width="20" height="20" rx="2" fill="#1a1210" />
                  <rect x="120" y="10" width="50" height="50" rx="6" fill="#1a1210" />
                  <rect x="128" y="18" width="34" height="34" rx="3" fill="white" />
                  <rect x="135" y="25" width="20" height="20" rx="2" fill="#1a1210" />
                  <rect x="10" y="120" width="50" height="50" rx="6" fill="#1a1210" />
                  <rect x="18" y="128" width="34" height="34" rx="3" fill="white" />
                  <rect x="25" y="135" width="20" height="20" rx="2" fill="#1a1210" />
                  {/* Data modules */}
                  {[70,78,86,94,102,110].map((x,i) => [70,78,86,94,102,110].map((y,j) => ((i+j)%3!==1) && (
                    <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1" fill="#1a1210" />
                  )))}
                  {[70,78,86,94,102].map((x,i) => [18,26,34,42,50,128,136,144,152].map((y,j) => ((i+j)%2===0) && (
                    <rect key={`d-${x}-${y}`} x={x} y={y} width="6" height="6" rx="1" fill="#1a1210" />
                  )))}
                  {[18,26,34,42,50,128,136,144,152].map((x,i) => [70,78,86,94,102].map((y,j) => ((i+j)%2===0) && (
                    <rect key={`e-${x}-${y}`} x={x} y={y} width="6" height="6" rx="1" fill="#1a1210" />
                  )))}
                  {/* UPI logo center */}
                  <rect x="72" y="72" width="36" height="36" rx="6" fill="white" />
                  <text x="90" y="93" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="10" fill="#bf2b15">UPI</text>
                </svg>
                {/* Animated scan line */}
                <div
                  className="absolute left-0 right-0 h-0.5"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, #bf2b15 50%, transparent 100%)",
                    animation: "scanLine 2s linear infinite",
                  }}
                />
                <style>{`
                  @keyframes scanLine {
                    0% { top: 10px; opacity: 1; }
                    45% { top: 165px; opacity: 1; }
                    50% { top: 165px; opacity: 0; }
                    55% { top: 10px; opacity: 0; }
                    60% { top: 10px; opacity: 1; }
                    100% { top: 10px; opacity: 1; }
                  }
                `}</style>
              </div>

              <p className="text-center text-xs text-stone-500">Scan with any UPI app — or enter your UPI ID below</p>

              {/* Popular UPI apps */}
              <div className="flex justify-center gap-3">
                {["GPay", "PhonePe", "Paytm", "BHIM"].map(app => (
                  <button key={app} onClick={() => setUpiId(`9876543210@${app.toLowerCase()}`)}
                    className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl border border-amber-200 hover:border-red-400 transition-all text-[9px] font-bold text-stone-600"
                    style={{ background: "rgba(255,255,255,0.7)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{ background: app === "GPay" ? "#4285f4" : app === "PhonePe" ? "#5f259f" : app === "Paytm" ? "#00baf2" : "#00a859", color: "white" }}>
                      {app[0]}
                    </div>
                    {app}
                  </button>
                ))}
              </div>

              {/* UPI ID input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-600">UPI ID</label>
                <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)}
                  placeholder="yourname@upi or 9876543210@paytm"
                  className="w-full border border-amber-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-red-400"
                  style={{ background: "rgba(255,255,255,0.8)", color: "#2b221e" }} />
              </div>

              <button onClick={handleUpiSubmit} disabled={upiLoading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: upiLoading ? "#9c8e84" : "linear-gradient(135deg, #bf2b15 0%, #8a1708 100%)" }}>
                {upiLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authorizing...</>
                ) : (
                  <><CheckCircle2 size={16} /> Authorize Payment</>
                )}
              </button>

              <p className="text-center text-[10px] text-stone-400 flex items-center justify-center gap-1">
                <Lock size={10} /> 256-bit encrypted · Sandbox simulation mode
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Card Modal ─────────────────────────────────────────────── */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,20,15,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="relative w-full max-w-md rounded-3xl border border-amber-200/60 shadow-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #faf7f0 0%, #f0e8d8 100%)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/60" style={{ background: "linear-gradient(135deg, #1a1210 0%, #2b221e 100%)" }}>
              <div className="flex items-center gap-2">
                <CreditCard className="text-amber-300 w-5 h-5" />
                <span className="text-white font-bold text-sm">Card Payment</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(191,43,21,0.3)", color: "#f87171" }}>Sandbox</span>
              </div>
              <button onClick={() => setShowCardModal(false)} className="text-white/60 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Amount */}
              <div className="text-center">
                <p className="text-xs text-stone-500 mb-1">Amount to Pay</p>
                <p className="text-3xl font-black" style={{ color: "#bf2b15" }}>{formatINR(finalTotals.finalTotal)}</p>
              </div>

              {/* ─── 3D Card ─── */}
              <div className="relative mx-auto" style={{ width: 320, height: 190, perspective: "1000px" }}>
                <div style={{
                  width: "100%", height: "100%",
                  transformStyle: "preserve-3d",
                  transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  position: "relative",
                }}>
                  {/* Front */}
                  <div style={{
                    position: "absolute", width: "100%", height: "100%",
                    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                    borderRadius: "16px", padding: "20px 24px",
                    background: "linear-gradient(135deg, #1a1210 0%, #bf2b15 50%, #701406 100%)",
                    boxShadow: "0 20px 60px rgba(191,43,21,0.3)",
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                  }}>
                    <div className="flex justify-between items-start">
                      <div style={{ width: 40, height: 30, background: "linear-gradient(135deg, #ffd700, #ffa500)", borderRadius: 6 }} />
                      <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>{getCardBrand()}</span>
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 18, letterSpacing: "0.2em", fontFamily: "monospace", fontWeight: 600 }}>
                      {cardNumber || "•••• •••• •••• ••••"}
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>Card Holder</div>
                        <div style={{ color: "white", fontSize: 13, fontWeight: 600, marginTop: 2 }}>{cardName || "YOUR NAME"}</div>
                      </div>
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>Expires</div>
                        <div style={{ color: "white", fontSize: 13, fontWeight: 600, marginTop: 2 }}>{cardExpiry || "MM/YY"}</div>
                      </div>
                    </div>
                  </div>
                  {/* Back */}
                  <div style={{
                    position: "absolute", width: "100%", height: "100%",
                    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #2b221e 0%, #1a1210 100%)",
                    boxShadow: "0 20px 60px rgba(191,43,21,0.3)",
                  }}>
                    <div style={{ background: "#111", height: 40, marginTop: 24, width: "100%" }} />
                    <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ background: "#f0e8d8", borderRadius: 6, padding: "8px 16px", display: "flex", justifyContent: "flex-end" }}>
                        <span style={{ color: "#1a1210", fontFamily: "monospace", fontWeight: 700, letterSpacing: 4, fontSize: 16 }}>
                          {cardCvv || "•••"}
                        </span>
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, textAlign: "right" }}>CVV</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card inputs */}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">Card Number</label>
                  <input type="text" value={cardNumber} maxLength={19}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full border border-amber-200 rounded-xl py-2.5 px-4 text-sm font-mono focus:outline-none focus:border-red-400"
                    style={{ background: "rgba(255,255,255,0.8)", color: "#2b221e" }} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">Cardholder Name</label>
                  <input type="text" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())}
                    placeholder="RAHUL SHARMA"
                    className="w-full border border-amber-200 rounded-xl py-2.5 px-4 text-sm uppercase font-semibold focus:outline-none focus:border-red-400"
                    style={{ background: "rgba(255,255,255,0.8)", color: "#2b221e" }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">Expiry (MM/YY)</label>
                    <input type="text" value={cardExpiry} maxLength={5}
                      onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="12/27"
                      className="w-full border border-amber-200 rounded-xl py-2.5 px-4 text-sm font-mono focus:outline-none focus:border-red-400"
                      style={{ background: "rgba(255,255,255,0.8)", color: "#2b221e" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">CVV</label>
                    <input type="password" value={cardCvv} maxLength={4}
                      onChange={e => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      onFocus={() => setCardFlipped(true)}
                      onBlur={() => setCardFlipped(false)}
                      placeholder="•••"
                      className="w-full border border-amber-200 rounded-xl py-2.5 px-4 text-sm font-mono focus:outline-none focus:border-red-400"
                      style={{ background: "rgba(255,255,255,0.8)", color: "#2b221e" }} />
                  </div>
                </div>
              </div>

              <button onClick={handleCardSubmit} disabled={cardLoading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: cardLoading ? "#9c8e84" : "linear-gradient(135deg, #1a1210 0%, #bf2b15 100%)" }}>
                {cardLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing Card...</>
                ) : (
                  <><Lock size={14} /> Pay {formatINR(finalTotals.finalTotal)}</>
                )}
              </button>

              <p className="text-center text-[10px] text-stone-400 flex items-center justify-center gap-1">
                <Lock size={10} /> 3D Secure · Sandbox simulation mode · No real charge
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldCheck className="text-indigo-400" /> Secure Checkout
        </h1>
        <p className="text-xs text-slate-500 mt-1">Select delivery details and choose your preferred payment option</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ─── Left Column ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Address Section */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-indigo-400" /> Delivery Address
              </span>
              <button onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <Plus size={14} /> Add New
              </button>
            </div>

            {!showAddressForm && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.length === 0 ? (
                  <div className="sm:col-span-2 text-center py-6 text-xs text-slate-500">
                    No addresses registered. Please add a shipping address.
                  </div>
                ) : (
                  addresses.map((a) => (
                    <button key={a.id} onClick={() => setSelectedAddressId(a.id)}
                      className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${selectedAddressId === a.id ? "border-indigo-500 bg-indigo-950/20" : "border-slate-800 bg-slate-900/30 hover:border-slate-700"}`}>
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-sm text-slate-200">{a.name}</span>
                        {a.isDefault && <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 py-0.5 px-2 rounded-full">DEFAULT</span>}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{a.street}, {a.city}, {a.state} – {a.pincode}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 font-semibold">
                        <Phone size={10} /> {a.phone}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {showAddressForm && (
              <form onSubmit={handleAddAddress} className="flex flex-col gap-4 text-slate-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Recipient Name</label>
                    <input type="text" required placeholder="Rahul Sharma" value={newName} onChange={e => setNewName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">10-Digit Mobile Number</label>
                    <input type="tel" required placeholder="9876543210" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Street Address & Landmark</label>
                  <input type="text" required placeholder="Flat No, Wing, H.No, MG Road..." value={newStreet} onChange={e => setNewStreet(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">City / Region</label>
                    <input type="text" required placeholder="Bengaluru" value={newCity} onChange={e => setNewCity(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">State</label>
                    <input type="text" required placeholder="Karnataka" value={newState} onChange={e => setNewState(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">6-Digit Pincode</label>
                    <input type="text" required placeholder="560038" value={newPincode} onChange={e => setNewPincode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input type="checkbox" id="new_is_default" checked={newIsDefault} onChange={e => setNewIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
                  <label htmlFor="new_is_default" className="text-xs text-slate-400">Mark as my default shipping address</label>
                </div>
                <div className="flex gap-3 justify-end mt-2">
                  <button type="button" onClick={() => setShowAddressForm(false)}
                    className="py-2 px-4 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit"
                    className="py-2 px-6 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
                    Save Address
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Pincode serviceable warning */}
          {selectedAddress && pincodeCheck && (
            <div className={`p-4 rounded-2xl border flex gap-3 items-start ${pincodeCheck.serviceable ? "border-emerald-500/20 bg-emerald-950/10 text-emerald-400" : "border-rose-500/20 bg-rose-950/10 text-rose-400"}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold">Shipping verification: </span>
                {pincodeCheck.serviceable ? (
                  <>Serviceable to <strong>{pincodeCheck.city}, {pincodeCheck.state}</strong>. Est. delivery: <strong>{pincodeCheck.deliveryDays} days</strong>.</>
                ) : (
                  <>Pincode <strong>{selectedAddress.pincode}</strong> is not serviceable. Please choose another address.</>
                )}
              </div>
            </div>
          )}

          {/* ─── Payment Method Selector ─────────────────────────────────── */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/80 pb-3 flex items-center gap-1.5">
              <CreditCard size={14} className="text-indigo-400" /> Choose Payment Method
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Online / UPI */}
              <button
                id="payment-method-online"
                onClick={() => setPaymentMethod("ONLINE")}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all text-center ${paymentMethod === "ONLINE" ? "border-indigo-500 bg-indigo-950/20" : "border-slate-800 bg-slate-900/20 hover:border-slate-700"}`}>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${paymentMethod === "ONLINE" ? "bg-indigo-600" : "bg-slate-800"}`}>
                  <Smartphone size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">UPI / Online</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">GPay, PhonePe, Paytm</p>
                </div>
                {paymentMethod === "ONLINE" && (
                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">SELECTED</span>
                )}
              </button>

              {/* Card */}
              <button
                id="payment-method-card"
                onClick={() => setPaymentMethod("CARD")}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all text-center ${paymentMethod === "CARD" ? "border-indigo-500 bg-indigo-950/20" : "border-slate-800 bg-slate-900/20 hover:border-slate-700"}`}>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${paymentMethod === "CARD" ? "bg-indigo-600" : "bg-slate-800"}`}>
                  <CreditCard size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">Card Payment</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Debit, Credit, RuPay</p>
                </div>
                {paymentMethod === "CARD" && (
                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">SELECTED</span>
                )}
              </button>

              {/* COD */}
              <button
                id="payment-method-cod"
                onClick={() => setPaymentMethod("COD")}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all text-center ${paymentMethod === "COD" ? "border-emerald-500 bg-emerald-950/20" : "border-slate-800 bg-slate-900/20 hover:border-slate-700"}`}>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${paymentMethod === "COD" ? "bg-emerald-600" : "bg-slate-800"}`}>
                  <Truck size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">Cash on Delivery</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Pay when delivered</p>
                </div>
                {paymentMethod === "COD" && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">SELECTED</span>
                )}
              </button>
            </div>

            {/* COD notice */}
            {paymentMethod === "COD" && (
              <div className="flex gap-2 items-start p-3 rounded-xl bg-emerald-950/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <Package size={14} className="flex-shrink-0 mt-0.5" />
                <span>Keep the exact amount ready. Our delivery partner collects cash at your doorstep.</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Column: Summary ────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/80 pb-3">Order Summary</span>

            <div className="flex flex-col gap-2.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Items Subtotal (Before Tax)</span>
                <span>{formatINR(finalTotals.totalTaxableValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Amount</span>
                <span>{formatINR(finalTotals.totalGstAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping & Handling</span>
                {finalTotals.shipping > 0 ? (
                  <span>{formatINR(finalTotals.shipping)}</span>
                ) : (
                  <span className="text-emerald-400 font-bold">FREE</span>
                )}
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon Discount</span>
                  <span>– {formatINR(couponDiscount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-4 flex justify-between items-baseline">
              <span className="text-sm font-bold text-white">Grand Total</span>
              <span className="text-xl font-black text-indigo-400">{formatINR(finalTotals.finalTotal)}</span>
            </div>

            {/* Payment summary badge */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-900/20 text-xs text-slate-400">
              {paymentMethod === "ONLINE" && <><Smartphone size={13} className="text-indigo-400" /> Paying via UPI / Online</>}
              {paymentMethod === "CARD" && <><CreditCard size={13} className="text-indigo-400" /> Paying via Card</>}
              {paymentMethod === "COD" && <><Truck size={13} className="text-emerald-400" /><span className="text-emerald-400">Cash on Delivery</span></>}
            </div>

            <button
              id="place-order-btn"
              onClick={handlePayment}
              disabled={placingOrder || !selectedAddressId || (pincodeCheck ? !pincodeCheck.serviceable : false)}
              className="w-full text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm glow-btn relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: paymentMethod === "COD"
                  ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                  : "linear-gradient(135deg, #bf2b15 0%, #701406 100%)"
              }}>
              {placingOrder ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Placing Order...</>
              ) : paymentMethod === "COD" ? (
                <><Truck size={15} /> Place COD Order</>
              ) : (
                <><Lock size={14} /> Proceed to Pay {formatINR(finalTotals.finalTotal)}</>
              )}
            </button>

            <p className="text-[10px] text-center text-slate-500">
              By placing the order you agree to our Terms & GST filing rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
