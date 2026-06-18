"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Providers";
import { formatINR } from "@/lib/gst";
import { 
  User, 
  MapPin, 
  ShoppingBag, 
  KeyRound, 
  Plus, 
  Trash2, 
  Star, 
  Printer, 
  Calendar,
  CreditCard,
  Phone,
  ShieldCheck,
  UserCheck,
  LogOut,
  Mail,
  Loader2
} from "lucide-react";

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

interface Payment {
  id: string;
  status: string;
  method: string | null;
  razorpayPaymentId: string | null;
  razorpayOrderId: string;
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
  payments: Payment[];
  items: Array<{
    id: string;
    quantity: number;
    priceAtPurchase: number;
    variant: {
      sku: string;
      product: {
        name: string;
      };
    };
  }>;
}

type TabType = "profile" | "addresses" | "orders";

export default function UserProfileDashboard() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("profile");
  
  // Profile Form States
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileUpdating, setProfileUpdating] = useState(false);

  // Address States
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddrName, setNewAddrName] = useState("");
  const [newAddrStreet, setNewAddrStreet] = useState("");
  const [newAddrCity, setNewAddrCity] = useState("");
  const [newAddrState, setNewAddrState] = useState("");
  const [newAddrPincode, setNewAddrPincode] = useState("");
  const [newAddrPhone, setNewAddrPhone] = useState("");
  const [newAddrIsDefault, setNewAddrIsDefault] = useState(false);
  const [addrSubmitting, setAddrSubmitting] = useState(false);

  // Orders States
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Loading States
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/profile");
    } else if (status === "authenticated" && session?.user) {
      setProfileName(session.user.name || "");
      setProfilePhone((session.user as any).phone || "");
      loadAddresses();
      loadOrders();
      setInitialLoading(false);
    }
  }, [status, session]);

  const loadAddresses = async () => {
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/addresses");
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (err) {
      console.error("Error loading addresses:", err);
    } finally {
      setAddressesLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast("Name cannot be empty", "error");
      return;
    }
    if (profilePassword && profilePassword !== profileConfirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }

    setProfileUpdating(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          password: profilePassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast("Profile details updated successfully! 🌸", "success");
        setProfilePassword("");
        setProfileConfirmPassword("");
        // Update Session context
        await updateSession({
          name: profileName,
          phone: profilePhone,
        });
      } else {
        toast(data.error || "Failed to update profile", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error updating profile", "error");
    } finally {
      setProfileUpdating(false);
    }
  };

  // Handle Address Add
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrName.trim() || !newAddrStreet.trim() || !newAddrCity.trim() || !newAddrState.trim()) {
      toast("Please fill in all address fields", "error");
      return;
    }
    if (!/^\d{6}$/.test(newAddrPincode)) {
      toast("Pincode must be exactly 6 digits", "error");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(newAddrPhone)) {
      toast("Phone number must be a valid 10-digit mobile number", "error");
      return;
    }

    setAddrSubmitting(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAddrName,
          street: newAddrStreet,
          city: newAddrCity,
          state: newAddrState,
          pincode: newAddrPincode,
          phone: newAddrPhone,
          isDefault: newAddrIsDefault,
        }),
      });

      if (res.ok) {
        toast("New address added successfully!", "success");
        setNewAddrName("");
        setNewAddrStreet("");
        setNewAddrCity("");
        setNewAddrState("");
        setNewAddrPincode("");
        setNewAddrPhone("");
        setNewAddrIsDefault(false);
        setShowAddressForm(false);
        loadAddresses();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to add address", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Network error adding address", "error");
    } finally {
      setAddrSubmitting(false);
    }
  };

  // Handle Set Default Address
  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const res = await fetch(`/api/addresses/${addressId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      if (res.ok) {
        toast("Default address updated", "success");
        loadAddresses();
      } else {
        toast("Failed to update default address", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Network error updating address", "error");
    }
  };

  // Handle Delete Address
  const handleDeleteAddress = async (addressId: string) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;

    try {
      const res = await fetch(`/api/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast("Address deleted successfully", "success");
        loadAddresses();
      } else {
        toast("Failed to delete address", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Network error deleting address", "error");
    }
  };

  if (initialLoading || status === "loading") {
    return (
      <div className="flex flex-col gap-6 py-20 items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-8 w-8 text-rose-500" />
        <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Syncing dashboard...</p>
      </div>
    );
  }

  const orderStatusColors: Record<string, string> = {
    PENDING: "text-amber-600 bg-amber-50 border-amber-200",
    CONFIRMED: "text-blue-600 bg-blue-50 border-blue-200",
    PROCESSING: "text-indigo-600 bg-indigo-50 border-indigo-200",
    SHIPPED: "text-purple-600 bg-purple-50 border-purple-200",
    DELIVERED: "text-emerald-600 bg-emerald-50 border-emerald-200",
    CANCELLED: "text-slate-500 bg-slate-100 border-slate-200",
    RETURN_REQUESTED: "text-rose-600 bg-rose-50 border-rose-200",
    REFUNDED: "text-teal-600 bg-teal-50 border-teal-200",
  };

  return (
    <div className="max-w-6xl mx-auto py-6 flex flex-col gap-8">
      {/* Header Profile Title card */}
      <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50/50 to-pink-50/20 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-md font-bold text-2xl">
            {profileName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-rose-950 font-serif leading-tight">Hello, {profileName} ✨</h1>
            <p className="text-xs text-rose-700/80 font-medium mt-1">Manage your skincare profile, shipping addresses, and purchase history</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100/60 text-rose-700 border border-rose-200/50 uppercase tracking-wider">
            <UserCheck size={12} /> {(session?.user as any)?.role || "CUSTOMER"}
          </span>
          <button 
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-1.5 py-1.5 px-4 rounded-xl text-xs font-bold border border-rose-200/70 hover:bg-rose-100/30 text-rose-800 transition-colors"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 flex flex-col gap-2 bg-white p-3 rounded-2xl border border-rose-100/80 shadow-sm">
          {[
            { id: "profile", label: "My Account Details", icon: User },
            { id: "addresses", label: "Shipping Addresses", icon: MapPin },
            { id: "orders", label: "My Orders & Payments", icon: ShoppingBag },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-3 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-left ${
                  isSelected 
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/10" 
                    : "text-rose-950 hover:bg-rose-50/50 hover:text-rose-900"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="md:col-span-3">
          {/* 1. Account details panel */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl border border-rose-100/80 shadow-sm p-6 flex flex-col gap-6">
              <div className="border-b border-rose-100 pb-3">
                <h3 className="font-serif font-black text-rose-950 text-lg flex items-center gap-2">
                  <User className="text-rose-500" size={18} /> Sign In & Personal Details
                </h3>
                <p className="text-[11px] text-rose-700/60 mt-1">Review your login credentials and update contact details</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-rose-900 block mb-1.5">Full Name</label>
                    <input 
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-rose-50/30 border border-rose-100 rounded-xl py-2 px-3.5 text-xs text-rose-950 focus:outline-none focus:border-rose-400 placeholder-rose-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-rose-900 block mb-1.5">Phone Number</label>
                    <div className="relative">
                      <input 
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-rose-50/30 border border-rose-100 rounded-xl py-2 pl-9 pr-3.5 text-xs text-rose-950 focus:outline-none focus:border-rose-400 placeholder-rose-300"
                      />
                      <Phone className="absolute left-3 top-2.5 text-rose-300" size={13} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-rose-900 block mb-1.5">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email"
                      value={session?.user?.email || ""}
                      className="w-full bg-rose-50/10 border border-rose-100/50 rounded-xl py-2 pl-9 pr-3.5 text-xs text-rose-600/80 cursor-not-allowed"
                      disabled
                    />
                    <Mail className="absolute left-3 top-2.5 text-rose-200" size={13} />
                  </div>
                  <span className="text-[10px] text-rose-700/50 mt-1 block font-medium">To protect account security, email updates must be requested via support.</span>
                </div>

                <div className="border-t border-rose-100 my-4 pt-4 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound size={13} className="text-rose-500" /> Change Password (Optional)
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-rose-900 block mb-1.5">New Password</label>
                      <input 
                        type="password"
                        value={profilePassword}
                        onChange={(e) => setProfilePassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full bg-rose-50/30 border border-rose-100 rounded-xl py-2 px-3.5 text-xs text-rose-950 focus:outline-none focus:border-rose-400 placeholder-rose-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-rose-900 block mb-1.5">Confirm New Password</label>
                      <input 
                        type="password"
                        value={profileConfirmPassword}
                        onChange={(e) => setProfileConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full bg-rose-50/30 border border-rose-100 rounded-xl py-2 px-3.5 text-xs text-rose-950 focus:outline-none focus:border-rose-400 placeholder-rose-300"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={profileUpdating}
                  className="bg-rose-500 hover:bg-rose-600 font-bold py-2.5 px-6 rounded-xl text-xs text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 self-start"
                >
                  {profileUpdating && <Loader2 className="animate-spin h-3.5 w-3.5" />}
                  Save Profile Details
                </button>
              </form>
            </div>
          )}

          {/* 2. Address management panel */}
          {activeTab === "addresses" && (
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-2xl border border-rose-100/80 shadow-sm p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-rose-100 pb-3">
                  <div>
                    <h3 className="font-serif font-black text-rose-950 text-lg flex items-center gap-2">
                      <MapPin className="text-rose-500" size={18} /> Saved Shipping Addresses
                    </h3>
                    <p className="text-[11px] text-rose-700/60 mt-1">Manage delivery locations for automatic HSN state calculation at checkout</p>
                  </div>
                  
                  {!showAddressForm && (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <Plus size={14} /> Add Address
                    </button>
                  )}
                </div>

                {/* Add Address Form */}
                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="bg-rose-50/30 border border-rose-100 rounded-2xl p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider">New Shipping Destination</h4>
                      <button 
                        type="button" 
                        onClick={() => setShowAddressForm(false)} 
                        className="text-rose-400 hover:text-rose-700 font-bold text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-rose-900 block mb-1">Receiver's Name</label>
                        <input
                          type="text"
                          value={newAddrName}
                          onChange={(e) => setNewAddrName(e.target.value)}
                          placeholder="Full name"
                          className="w-full bg-white border border-rose-100 rounded-xl py-2 px-3 text-xs text-rose-950 focus:outline-none focus:border-rose-450 placeholder-rose-300"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-rose-900 block mb-1">Mobile Number</label>
                        <input
                          type="tel"
                          value={newAddrPhone}
                          onChange={(e) => setNewAddrPhone(e.target.value)}
                          placeholder="10-digit number"
                          className="w-full bg-white border border-rose-100 rounded-xl py-2 px-3 text-xs text-rose-950 focus:outline-none focus:border-rose-450 placeholder-rose-300"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-rose-900 block mb-1">Street Address</label>
                      <input
                        type="text"
                        value={newAddrStreet}
                        onChange={(e) => setNewAddrStreet(e.target.value)}
                        placeholder="House / Flat No., Apartment, Colony"
                        className="w-full bg-white border border-rose-100 rounded-xl py-2 px-3 text-xs text-rose-950 focus:outline-none focus:border-rose-450 placeholder-rose-300"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-rose-900 block mb-1">City</label>
                        <input
                          type="text"
                          value={newAddrCity}
                          onChange={(e) => setNewAddrCity(e.target.value)}
                          placeholder="City"
                          className="w-full bg-white border border-rose-100 rounded-xl py-2 px-3 text-xs text-rose-950 focus:outline-none focus:border-rose-450 placeholder-rose-300"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-rose-900 block mb-1">State</label>
                        <input
                          type="text"
                          value={newAddrState}
                          onChange={(e) => setNewAddrState(e.target.value)}
                          placeholder="e.g. Karnataka"
                          className="w-full bg-white border border-rose-100 rounded-xl py-2 px-3 text-xs text-rose-950 focus:outline-none focus:border-rose-450 placeholder-rose-300"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-rose-900 block mb-1">Pincode</label>
                        <input
                          type="text"
                          value={newAddrPincode}
                          onChange={(e) => setNewAddrPincode(e.target.value)}
                          placeholder="6 digits"
                          className="w-full bg-white border border-rose-100 rounded-xl py-2 px-3 text-xs text-rose-950 focus:outline-none focus:border-rose-450 placeholder-rose-300"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="default-address-cb"
                        checked={newAddrIsDefault}
                        onChange={(e) => setNewAddrIsDefault(e.target.checked)}
                        className="rounded border-rose-200 text-rose-500 focus:ring-rose-500 h-4 w-4"
                      />
                      <label htmlFor="default-address-cb" className="text-xs font-bold text-rose-900 cursor-pointer">
                        Set as primary billing & shipping address
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={addrSubmitting}
                      className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 self-start transition-colors"
                    >
                      {addrSubmitting && <Loader2 className="animate-spin h-3.5 w-3.5" />}
                      Add Destination
                    </button>
                  </form>
                )}

                {/* Addresses Grid */}
                {addressesLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="animate-spin h-5 w-5 text-rose-500" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8 bg-rose-50/10 border border-dashed border-rose-200 rounded-2xl">
                    <MapPin className="h-10 w-10 text-rose-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-rose-900">No Shipping Addresses Saved</p>
                    <p className="text-[10px] text-rose-700/60 mt-0.5">Please add a shipping destination to proceed with checkouts.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {addresses.map((addr) => (
                      <div 
                        key={addr.id} 
                        className={`rounded-2xl border p-4 flex flex-col justify-between gap-4 transition-all ${
                          addr.isDefault 
                            ? "border-rose-400 bg-rose-50/25 shadow-sm" 
                            : "border-rose-100 hover:border-rose-200"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-xs text-rose-950">{addr.name}</span>
                            {addr.isDefault && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white uppercase tracking-wider">
                                <Star size={8} fill="white" /> Primary
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-rose-900 leading-relaxed">{addr.street}</p>
                          <p className="text-[11px] text-rose-900 mt-0.5">{addr.city}, {addr.state} - <span className="font-semibold">{addr.pincode}</span></p>
                          <p className="text-[11px] text-rose-700/80 font-medium mt-1 flex items-center gap-1">
                            <Phone size={10} /> {addr.phone}
                          </p>
                        </div>

                        <div className="flex justify-between items-center border-t border-rose-100/60 pt-3 mt-1">
                          {!addr.isDefault ? (
                            <button
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-[10px] font-bold text-rose-600 hover:text-rose-800"
                            >
                              Make Default
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                              <ShieldCheck size={10} /> Default
                            </span>
                          )}

                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-rose-400 hover:text-rose-700 p-1 transition-colors"
                            title="Delete Address"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Orders history panel */}
          {activeTab === "orders" && (
            <div className="bg-white rounded-2xl border border-rose-100/80 shadow-sm p-6 flex flex-col gap-4">
              <div className="border-b border-rose-100 pb-3">
                <h3 className="font-serif font-black text-rose-950 text-lg flex items-center gap-2">
                  <ShoppingBag className="text-rose-500" size={18} /> Order History & Payments
                </h3>
                <p className="text-[11px] text-rose-700/60 mt-1">Track fulfillment status, check payment logs, and download HSN tax invoices</p>
              </div>

              {ordersLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin h-6 w-6 text-rose-500" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-rose-50/10 border border-dashed border-rose-200 rounded-2xl">
                  <ShoppingBag className="h-10 w-10 text-rose-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-rose-900">No Orders Placed Yet</p>
                  <p className="text-[10px] text-rose-700/60 mt-0.5">Explore our premium skincare catalog and make your first order!</p>
                  <button 
                    onClick={() => router.push("/products")}
                    className="mt-4 bg-rose-500 hover:bg-rose-600 text-white font-bold py-1.5 px-4 rounded-xl text-xs shadow-sm transition-colors"
                  >
                    Browse Skincare
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5 mt-2">
                  {orders.map((order) => {
                    const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });

                    // Payment details
                    const payment = order.payments && order.payments[0];
                    const paymentMethod = payment?.method || "COD";
                    const paymentStatus = payment?.status || "PENDING";
                    const razorpayId = payment?.razorpayPaymentId;

                    return (
                      <div 
                        key={order.id}
                        className="border border-rose-100 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow"
                      >
                        {/* Order Sub-Header */}
                        <div className="bg-rose-50/20 border-b border-rose-100/70 p-4 flex flex-wrap justify-between items-center gap-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-xs text-rose-950">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border ${orderStatusColors[order.status] || "text-rose-900 bg-rose-50"}`}>
                              {order.status}
                            </span>
                            <span className="text-[10px] text-rose-700/60 font-semibold flex items-center gap-0.5">
                              <Calendar size={11} /> {orderDate}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-rose-700/60 block font-bold">TOTAL AMOUNT</span>
                            <span className="text-xs font-black text-rose-950">{formatINR(order.total)}</span>
                          </div>
                        </div>

                        {/* Order Body Details */}
                        <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Products summary list */}
                            <span className="text-[9px] font-bold text-rose-800/60 uppercase tracking-wider block mb-1">Purchased Products</span>
                            <ul className="text-[11px] text-rose-900 font-semibold flex flex-col gap-1">
                              {order.items.map((item) => (
                                <li key={item.id} className="truncate">
                                  🧴 {item.variant.product.name} <span className="text-rose-700">x{item.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Payment information logs */}
                          <div className="bg-rose-50/30 border border-rose-100/60 rounded-xl p-3 flex flex-col gap-1 text-[11px] self-stretch md:self-auto min-w-[200px]">
                            <span className="text-[9px] font-bold text-rose-800/60 uppercase tracking-wider block border-b border-rose-100 pb-1 mb-1">Payment Log</span>
                            <p className="text-rose-950 font-bold flex justify-between">
                              Method: <span className="text-rose-800">{paymentMethod === "COD" ? "Cash on Delivery" : `Razorpay (${paymentMethod})`}</span>
                            </p>
                            <p className="text-rose-950 font-bold flex justify-between">
                              Status: 
                              <span className={`font-black ${paymentStatus === "COMPLETED" ? "text-emerald-600" : "text-amber-600"}`}>
                                {paymentStatus}
                              </span>
                            </p>
                            {razorpayId && (
                              <p className="text-rose-950 text-[10px] font-bold flex justify-between font-mono mt-0.5">
                                Tx ID: <span className="text-rose-800">{razorpayId.substring(0, 14)}...</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions block */}
                        <div className="bg-rose-50/10 border-t border-rose-100/50 px-4 py-3 flex justify-between items-center">
                          <a 
                            href={`/api/orders/${order.id}/invoice`}
                            download
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-950"
                            title="Download PDF GST tax invoice"
                          >
                            <Printer size={13} /> Tax Invoice (PDF)
                          </a>

                          <button
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-900 font-bold py-1 px-3 rounded-xl text-[11px] shadow-sm transition-colors"
                          >
                            Track & View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
