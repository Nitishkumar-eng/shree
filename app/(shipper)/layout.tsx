"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
  LayoutDashboard, 
  Truck, 
  Store, 
  LogOut,
  Menu,
  X
} from "lucide-react";

export default function ShipperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Fulfillment Hub", href: "/shipper", icon: Truck },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100">
      {/* Desktop Shipper Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950 p-6 hidden md:flex flex-col justify-between h-screen sticky top-0">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <Link href="/shipper" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-widest text-rose-500">
              DEWKIT SHIPPER
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${isActive ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"}`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-2 border-t border-slate-900 pt-6">
          <div className="px-3 py-2 mb-2">
            <p className="text-[10px] text-slate-500">Delivery Partner</p>
            <p className="text-xs font-bold truncate text-slate-300">{session?.user?.name}</p>
          </div>

          <Link
            href="/"
            className="flex items-center gap-3 py-2 px-3 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-900/40 transition-colors"
          >
            <Store size={14} />
            Go to Storefront
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 py-2 px-3 rounded-lg text-xs text-rose-400 hover:bg-slate-900/60 transition-colors w-full text-left"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-900 bg-slate-950 px-4 py-3 flex items-center justify-between md:hidden">
        <span className="text-sm font-black tracking-widest text-rose-500">DEWKIT SHIPPER</span>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded-lg border border-slate-800 bg-slate-900/30 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Mobile Drawer Menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-64 bg-slate-950 h-full p-6 flex flex-col justify-between shadow-2xl border-r border-slate-900 animate-slide-in-right">
            <div className="flex flex-col gap-6">
              <span className="text-sm font-black tracking-widest text-rose-500">DEWKIT SHIPPER</span>
              <nav className="flex flex-col gap-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${isActive ? "bg-rose-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            <div className="flex flex-col gap-2 border-t border-slate-900 pt-6">
              <Link href="/" className="flex items-center gap-3 py-2 text-xs text-slate-400">
                <Store size={14} /> Go to Storefront
              </Link>
              <button onClick={() => signOut()} className="flex items-center gap-3 py-2 text-xs text-rose-400 text-left">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Core Page Content area */}
      <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto bg-slate-950">
        {children}
      </main>
    </div>
  );
}
