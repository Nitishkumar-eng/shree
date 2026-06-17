"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Providers";
import { Mail, Lock, LogIn, ArrowRight } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");
  const isGoogleConfigured = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && 
                            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== "google-client-id";

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      router.push(callbackUrl);
    }
  }, [session, router, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast("Please enter both email and password", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        toast(res.error, "error");
      } else {
        toast("Welcome back! Signed in successfully.", "success");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] py-10">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-slate-800">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white">Sign In to Shree</h2>
          <p className="text-xs text-slate-500 mt-1.5">Welcome back! Access your cart and track your orders</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs text-center mb-6">
            {error === "OAuthSignin" || error === "OAuthCallback" || error === "Signin"
              ? "Google Sign-In is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file."
              : "Authentication failed. Please check your credentials."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
              />
              <Mail className="absolute left-3.5 top-3 text-slate-600" size={16} />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <Link href="/login" className="text-[10px] text-indigo-400 hover:underline">
                Forgot password?
              </Link>
            </div>
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
            {loading ? "Signing in..." : <>Sign In <LogIn size={16} /></>}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">or continue with</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Google OAuth */}
        {isGoogleConfigured ? (
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {/* Google Logo */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.98 0 12 0 7.35 0 3.37 2.67 1.43 6.56l3.86 3C6.2 6.94 8.89 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.49z"
              />
              <path
                fill="#FBBC05"
                d="M5.29 14.44c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31l-3.86-3C.68 8.41 0 10.13 0 12s.68 3.59 1.43 5.19l3.86-3z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.3 1.09-3.11 0-5.8-1.9-6.74-4.52l-3.86 3C3.37 21.33 7.35 24 12 24z"
              />
            </svg>
            Google Account
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              disabled
              className="w-full bg-slate-900/20 border border-slate-900 text-slate-500 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm cursor-not-allowed"
            >
              {/* Google Logo */}
              <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.98 0 12 0 7.35 0 3.37 2.67 1.43 6.56l3.86 3C6.2 6.94 8.89 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.49z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.29 14.44c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31l-3.86-3C.68 8.41 0 10.13 0 12s.68 3.59 1.43 5.19l3.86-3z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.3 1.09-3.11 0-5.8-1.9-6.74-4.52l-3.86 3C3.37 21.33 7.35 24 12 24z"
                />
              </svg>
              Google Account (Unavailable)
            </button>
            <p className="text-[10px] text-amber-500/80 text-center leading-normal">
              Google OAuth is disabled. Provide a valid client ID in your `.env` file to enable.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-slate-500 mt-6">
          Don't have an account?{" "}
          <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-indigo-400 font-semibold hover:underline flex-inline items-center gap-0.5">
            Create account <ArrowRight size={12} className="inline ml-0.5" />
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><p className="text-slate-500 text-xs">Loading form...</p></div>}>
      <LoginContent />
    </Suspense>
  );
}
