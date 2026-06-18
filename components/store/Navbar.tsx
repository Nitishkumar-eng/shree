"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
  ShoppingBag, 
  Heart, 
  User, 
  Search, 
  Menu, 
  X, 
  LogOut, 
  LayoutDashboard, 
  History,
  Home
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const isShipper = (session?.user as any)?.role === "SHIPPER";

  // Load cart and wishlist counts
  useEffect(() => {
    const fetchCounts = async () => {
      if (!session) {
        // Fetch from local storage for guests
        try {
          const guestCart = JSON.parse(localStorage.getItem("dewkit-guest-cart") || "[]");
          const guestWish = JSON.parse(localStorage.getItem("dewkit-guest-wishlist") || "[]");
          setCartCount(guestCart.reduce((acc: number, item: any) => acc + item.quantity, 0));
          setWishlistCount(guestWish.length);
        } catch {
          setCartCount(0);
          setWishlistCount(0);
        }
        return;
      }

      try {
        const [cartRes, wishRes] = await Promise.all([
          fetch("/api/cart"),
          fetch("/api/wishlist")
        ]);
        if (cartRes.ok) {
          const cart = await cartRes.json();
          setCartCount(cart.reduce((acc: number, item: any) => acc + item.quantity, 0));
        }
        if (wishRes.ok) {
          const wish = await wishRes.json();
          setWishlistCount(wish.length);
        }
      } catch (e) {
        console.error("Error fetching navigation counts:", e);
      }
    };

    fetchCounts();

    // Listen to storage changes (for local cart updates)
    const handleCartUpdate = () => {
      fetchCounts();
      setIsCartBouncing(true);
      setTimeout(() => setIsCartBouncing(false), 400);
    };
    window.addEventListener("dewkit-cart-update", handleCartUpdate);
    return () => window.removeEventListener("dewkit-cart-update", handleCartUpdate);
  }, [session, pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md hidden md:block">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent">
              DEWKIT
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search products, brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-500 transition-colors"
            />
            <button type="submit" className="absolute right-3 top-2.5 text-slate-500 hover:text-indigo-400 transition-colors">
              <Search size={16} />
            </button>
          </form>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6">
            <Link 
              href="/products" 
              className={`text-sm font-medium hover:text-indigo-400 transition-colors ${pathname === "/products" ? "text-indigo-400" : "text-slate-300"}`}
            >
              Shop
            </Link>

            <Link href="/wishlist" className="relative text-slate-300 hover:text-indigo-400 transition-colors">
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link href="/cart" className="relative text-slate-300 hover:text-indigo-400 transition-colors">
              <ShoppingBag size={20} className={isCartBouncing ? "animate-cart-bounce" : ""} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-400 transition-colors focus:outline-none"
              >
                <User size={20} />
                {session?.user && (
                  <span className="text-xs font-semibold max-w-[80px] truncate">
                    {session.user.name?.split(" ")[0]}
                  </span>
                )}
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-56 rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-lg shadow-2xl z-20 p-2 py-3 flex flex-col gap-1">
                    {session?.user ? (
                      <>
                        <div className="px-3 py-2 border-b border-slate-800 mb-2">
                          <p className="text-xs text-slate-500">Logged in as</p>
                          <p className="text-sm font-semibold truncate text-slate-300">{session.user.name}</p>
                          <p className="text-xs truncate text-slate-500">{session.user.email}</p>
                        </div>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            <LayoutDashboard size={16} />
                            Admin Panel
                          </Link>
                        )}
                        {isShipper && (
                          <Link
                            href="/shipper"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            <LayoutDashboard size={16} />
                            Shipper Dashboard
                          </Link>
                        )}
                        <Link
                          href="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <User size={16} />
                          My Profile
                        </Link>
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            signOut();
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-rose-400 rounded-lg hover:bg-slate-800/80 transition-colors w-full text-left"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center justify-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors mx-2 mb-1"
                        >
                          Sign In
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center justify-center py-2 px-4 text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-semibold transition-colors mx-2"
                        >
                          Create Account
                        </Link>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Top Header (Search and Logo only) */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md md:hidden px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              DEWKIT
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {session && isAdmin && (
              <Link href="/admin" className="text-indigo-400 p-1 hover:bg-slate-900 rounded-lg transition-colors">
                <LayoutDashboard size={20} />
              </Link>
            )}
            {session && isShipper && (
              <Link href="/shipper" className="text-indigo-400 p-1 hover:bg-slate-900 rounded-lg transition-colors">
                <LayoutDashboard size={20} />
              </Link>
            )}
            {session ? (
              <button onClick={() => signOut()} className="text-rose-400 p-1 hover:bg-slate-900 rounded-lg transition-colors">
                <LogOut size={20} />
              </button>
            ) : (
              <Link href="/login" className="text-slate-300 font-semibold text-sm py-1 px-3 bg-slate-900 rounded-lg border border-slate-800">
                Login
              </Link>
            )}
          </div>
        </div>
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-full py-1.5 pl-4 pr-10 text-xs focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-500"
          />
          <button type="submit" className="absolute right-3 top-2 text-slate-500">
            <Search size={14} />
          </button>
        </form>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-lg md:hidden h-16 flex items-center justify-around px-2 pb-safe">
        <Link 
          href="/" 
          className={`flex flex-col items-center justify-center flex-1 gap-1 text-[10px] transition-colors ${pathname === "/" ? "text-indigo-400" : "text-slate-500"}`}
        >
          <Home size={20} />
          <span>Home</span>
        </Link>

        <Link 
          href="/products" 
          className={`flex flex-col items-center justify-center flex-1 gap-1 text-[10px] transition-colors ${pathname.startsWith("/products") ? "text-indigo-400" : "text-slate-500"}`}
        >
          <ShoppingBag size={20} />
          <span>Shop</span>
        </Link>

        <Link 
          href="/cart" 
          className={`relative flex flex-col items-center justify-center flex-1 gap-1 text-[10px] transition-colors ${pathname === "/cart" ? "text-indigo-400" : "text-slate-500"}`}
        >
          <ShoppingBag size={20} className={isCartBouncing ? "animate-cart-bounce" : ""} />
          {cartCount > 0 && (
            <span className="absolute top-1 right-5 bg-indigo-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          )}
          <span>Cart</span>
        </Link>

        <Link 
          href="/wishlist" 
          className={`relative flex flex-col items-center justify-center flex-1 gap-1 text-[10px] transition-colors ${pathname === "/wishlist" ? "text-indigo-400" : "text-slate-500"}`}
        >
          <Heart size={20} />
          {wishlistCount > 0 && (
            <span className="absolute top-1 right-5 bg-indigo-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {wishlistCount}
            </span>
          )}
          <span>Wishlist</span>
        </Link>

        <Link 
          href="/profile" 
          className={`flex flex-col items-center justify-center flex-1 gap-1 text-[10px] transition-colors ${pathname === "/profile" ? "text-indigo-400" : "text-slate-500"}`}
        >
          <User size={20} />
          <span>Profile</span>
        </Link>
      </nav>
    </>
  );
}
