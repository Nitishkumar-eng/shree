import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Truck, BadgePercent } from "lucide-react";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/gst";
import { mockDbStore } from "@/lib/mockDbStore";

// Server side data fetching for home page
async function getFeaturedProducts() {
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      include: {
        variants: true,
        reviews: {
          select: { rating: true }
        }
      },
      take: 4,
    });

    return products.map((p) => {
      const avgRating = p.reviews.length
        ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length
        : 4.5; // Mock/default high rating
      
      const lowestPrice = p.variants.length
        ? Math.min(...p.variants.map((v) => v.price))
        : 1999;

      const mrp = p.variants.length
        ? Math.max(...p.variants.map((v) => v.mrp))
        : 2999;

      const image = p.variants.length && p.variants[0].images.length
        ? p.variants[0].images[0]
        : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60";

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        price: lowestPrice,
        mrp: mrp,
        image,
        avgRating,
      };
    });
  } catch (error) {
    console.warn("Home page products load failed, falling back to mock store:", error);
    try {
      const products = mockDbStore.getProducts().filter((p: any) => p.isActive).slice(0, 4);
      return products.map((p: any) => {
        const avgRating = p.reviews.length
          ? p.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / p.reviews.length
          : 4.5;
        
        const lowestPrice = p.variants.length
          ? Math.min(...p.variants.map((v: any) => v.price))
          : 1999;

        const mrp = p.variants.length
          ? Math.max(...p.variants.map((v: any) => v.mrp))
          : 2999;

        const image = p.variants.length && p.variants[0].images.length
          ? p.variants[0].images[0]
          : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60";

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          price: lowestPrice,
          mrp: mrp,
          image,
          avgRating,
        };
      });
    } catch (fallbackError) {
      return [];
    }
  }
}

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts();

  return (
    <div className="flex flex-col gap-16 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl glass-card bg-slate-900/40 p-8 md:p-16 flex flex-col md:flex-row items-center gap-10">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex-1 flex flex-col items-start gap-6 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BadgePercent size={14} /> Monsoon Sale: Flat 10% Off
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Indian Engineering. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent">
              Acoustic & Tech Excellence
            </span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-lg leading-relaxed">
            Experience the next level of sound and craftsmanship. Designed for India, featuring deep bass response, custom size profiles, and GST invoices for easy tax write-offs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all glow-btn text-sm"
            >
              Shop Catalog <ArrowRight size={16} />
            </Link>
            <Link
              href="/products?category=audio"
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
            >
              Explore Audio
            </Link>
          </div>
        </div>

        {/* Hero Visual Banner (High Quality Unsplash Asset) */}
        <div className="flex-1 w-full md:w-auto relative aspect-video md:aspect-square rounded-2xl overflow-hidden group shadow-2xl border border-slate-800">
          <img
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80"
            alt="Shree Premium Products"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
            <div>
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Top Seller</p>
              <h3 className="text-lg font-bold text-white">Shree Strider Crimson</h3>
              <p className="text-xs text-slate-300">Starting from ₹2,499 (Inclusive of 12% GST)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl glass-card flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Truck size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold">Fast Pan-India Delivery</h4>
            <p className="text-[11px] text-slate-500 mt-1">Free shipping above ₹1,500. Delivery checks via pincode verification.</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold">GST Compliant Invoicing</h4>
            <p className="text-[11px] text-slate-500 mt-1">Enter business GSTIN to receive automatic HSN-coded PDF tax write-offs.</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Zap size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold">Secure Razorpay Integration</h4>
            <p className="text-[11px] text-slate-500 mt-1">Supports instant UPI apps, credit/debit cards, Netbanking, and easy EMI.</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <BadgePercent size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold">100% Genuine Quality</h4>
            <p className="text-[11px] text-slate-500 mt-1">Direct from manufacturers. High-fidelity active components and premium mesh.</p>
          </div>
        </div>
      </section>

      {/* Category Spotlight */}
      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold tracking-tight">Explore Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/products?category=audio"
            className="group relative h-64 rounded-2xl overflow-hidden border border-slate-800/80 shadow-lg"
          >
            <img
              src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80"
              alt="Audio Equipment"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-6 md:p-8">
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Acoustic Series</span>
              <h3 className="text-xl font-bold text-white mt-1">Premium Audio</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">ANC headphones and Bluetooth speakers engineered with deep bass profiles.</p>
            </div>
          </Link>

          <Link
            href="/products?category=shoes"
            className="group relative h-64 rounded-2xl overflow-hidden border border-slate-800/80 shadow-lg"
          >
            <img
              src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80"
              alt="Footwear Series"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-6 md:p-8">
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Apparel Series</span>
              <h3 className="text-xl font-bold text-white mt-1">Footwear & Fashion</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Ultra-cushioned sports striders and responsive trail running shoes.</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Featured Releases</h2>
          <Link href="/products" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            See all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((p) => {
            const discountPercent = Math.round(((p.mrp - p.price) / p.mrp) * 100);

            return (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="glass-card rounded-2xl overflow-hidden flex flex-col h-full group"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-slate-950">
                  {discountPercent > 0 && (
                    <span className="absolute top-3 left-3 bg-red-600 text-white font-bold text-[10px] py-1 px-2.5 rounded-full z-10">
                      {discountPercent}% OFF
                    </span>
                  )}
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col gap-2 flex-grow justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{p.brand}</span>
                    <h3 className="font-bold text-sm text-slate-200 mt-0.5 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                      {p.name}
                    </h3>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1 mt-1 text-amber-500">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-[11px] font-semibold text-slate-400 mt-0.5">{p.avgRating.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-900/60">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold text-white">{formatINR(p.price)}</span>
                      {p.mrp > p.price && (
                        <span className="text-xs text-slate-500 line-through">{formatINR(p.mrp)}</span>
                      )}
                    </div>
                    <span className="text-[9px] font-semibold text-slate-500">Incl. GST</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
