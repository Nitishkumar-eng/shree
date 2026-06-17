"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Providers";
import { User, Mail, Phone, Lock, UserPlus, ArrowLeft } from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    if (!name.trim()) return toast("Name is required", "error");
    if (!email.trim()) return toast("Email is required", "error");
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return toast("Please enter a valid 10-digit Indian phone number starting with 6-9", "error");
    }
    if (password.length < 6) {
      return toast("Password must be at least 6 characters", "error");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Registration failed", "error");
      } else {
        toast("Account created successfully! Please sign in.", "success");
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    } catch (err) {
      console.error(err);
      toast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh] py-10">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-slate-800">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/login" className="text-slate-500 hover:text-indigo-400 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-xs font-semibold text-slate-500">Back to login</span>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white">Create Account</h2>
          <p className="text-xs text-slate-500 mt-1.5">Sign up today and get access to exclusive coupons</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Full Name</label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
              />
              <User className="absolute left-3.5 top-3 text-slate-600" size={16} />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
              />
              <Mail className="absolute left-3.5 top-3 text-slate-600" size={16} />
            </div>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Indian Phone Number</label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
              />
              <Phone className="absolute left-3.5 top-3 text-slate-600" size={16} />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Password (min 6 characters)</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
              />
              <Lock className="absolute left-3.5 top-3 text-slate-600" size={16} />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 text-sm glow-btn"
          >
            {loading ? "Creating account..." : <>Create Account <UserPlus size={16} /></>}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-indigo-400 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><p className="text-slate-500 text-xs">Loading form...</p></div>}>
      <RegisterContent />
    </Suspense>
  );
}
