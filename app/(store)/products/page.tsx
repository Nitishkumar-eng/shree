"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatINR } from "@/lib/gst";
import { Filter, SlidersHorizontal, Search, RotateCcw, ChevronLeft, ChevronRight, X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  lowestPrice: number;
  highestPrice: number;
  mrp: number;
  avgRating: number;
  inStock: boolean;
  variants: Array<{ id: string; images: string[] }>;
}

function ProductsCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter States initialized from URL params
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter Form States
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("min") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max") || "");
  const [brand, setBrand] = useState(searchParams.get("brand") || "");
  const [rating, setRating] = useState(searchParams.get("rating") || "");
  const [inStockOnly, setInStockOnly] = useState(searchParams.get("inStock") === "true");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "newest");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync state with URL params on mount or param changes
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setCategory(searchParams.get("category") || "");
    setMinPrice(searchParams.get("min") || "");
    setMaxPrice(searchParams.get("max") || "");
    setBrand(searchParams.get("brand") || "");
    setRating(searchParams.get("rating") || "");
    setInStockOnly(searchParams.get("inStock") === "true");
    setSortBy(searchParams.get("sortBy") || "newest");
    setPage(parseInt(searchParams.get("page") || "1"));
  }, [searchParams]);

  // Fetch products when parameters sync
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.set("search", search);
        if (category) queryParams.set("category", category);
        if (minPrice) queryParams.set("min", minPrice);
        if (maxPrice) queryParams.set("max", maxPrice);
        if (brand) queryParams.set("brand", brand);
        if (rating) queryParams.set("rating", rating);
        if (inStockOnly) queryParams.set("inStock", "true");
        queryParams.set("sortBy", sortBy);
        queryParams.set("page", page.toString());
        queryParams.set("limit", "8");

        const res = await fetch(`/api/products?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [search, category, minPrice, maxPrice, brand, rating, inStockOnly, sortBy, page, searchParams]);

  // Trigger search params change in URL
  const applyFilters = (updates: Record<string, string | boolean | number>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    // Merge updates
    Object.entries(updates).forEach(([key, val]) => {
      if (val === "" || val === false || val === undefined) {
        current.delete(key);
      } else {
        current.set(key, val.toString());
      }
    });

    // Reset page to 1 when filters change (unless updating page itself)
    if (!updates.hasOwnProperty("page")) {
      current.delete("page");
    }

    router.push(`/products?${current.toString()}`);
  };

  const handleReset = () => {
    setSearch("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setBrand("");
    setRating("");
    setInStockOnly(false);
    setSortBy("newest");
    setPage(1);
    router.push("/products");
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900/60 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dewkit Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">Showing {products.length} of {total} products matching your criteria</p>
        </div>

        {/* Sorting & Filter controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="md:hidden flex items-center gap-2 py-2 px-4 rounded-xl border border-slate-800 bg-slate-900/40 text-xs font-semibold text-slate-300"
          >
            <SlidersHorizontal size={14} /> Filter
          </button>

          <select
            value={sortBy}
            onChange={(e) => applyFilters({ sortBy: e.target.value })}
            className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="newest">Newest Releases</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* Left Filter Sidebar - DESKTOP */}
        <aside className="w-64 glass-card rounded-2xl p-5 border border-slate-800 hidden md:flex flex-col gap-6 sticky top-20">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Filter size={12} className="text-indigo-400" /> Filters
            </span>
            <button onClick={handleReset} className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-0.5">
              <RotateCcw size={10} /> Reset All
            </button>
          </div>

          {/* Search inside catalog */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Product name..."
                onKeyDown={(e) => e.key === "Enter" && applyFilters({ search })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-3 pr-8 text-xs focus:outline-none focus:border-indigo-500 text-slate-300"
              />
              <button onClick={() => applyFilters({ search })} className="absolute right-2.5 top-2 text-slate-500 hover:text-indigo-400">
                <Search size={12} />
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
            <div className="flex flex-col gap-1.5 text-xs">
              {[
                { name: "All Skincare", slug: "" },
                { name: "Serums & Treatments", slug: "serums" },
                { name: "Moisturizers", slug: "moisturizers" },
                { name: "Cleansers", slug: "cleansers" },
                { name: "Sun Protection", slug: "sunprotection" },
                { name: "Masks & Exfoliants", slug: "masks" },
                { name: "Eye Care", slug: "eyecare" },
                { name: "Toners", slug: "toners" },
              ].map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => applyFilters({ category: cat.slug })}
                  className={`text-left py-1 hover:text-indigo-400 transition-colors ${category === cat.slug ? "text-indigo-400 font-bold" : "text-slate-400"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price Range (₹)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-center focus:outline-none text-slate-300"
              />
              <span className="text-slate-600">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-center focus:outline-none text-slate-300"
              />
            </div>
            <button
              onClick={() => applyFilters({ min: minPrice, max: maxPrice })}
              className="mt-1 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 rounded-lg text-xs transition-colors"
            >
              Apply Price
            </button>
          </div>

          {/* Availability */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
            <label className="text-xs text-slate-300 cursor-pointer" htmlFor="stock_check">
              In Stock Only
            </label>
            <input
              id="stock_check"
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => applyFilters({ inStock: e.target.checked })}
              className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {/* Brand */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brand</label>
            <select
              value={brand}
              onChange={(e) => applyFilters({ brand: e.target.value })}
              className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Brands</option>
              <option value="Dewkit">Dewkit</option>
            </select>
          </div>
        </aside>

        {/* Products Grid & Pagination */}
        <div className="flex-1 flex flex-col gap-8">
          {loading ? (
            /* Loading Skeletons */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-2xl h-80 animate-pulse border border-slate-800 bg-slate-900/20"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl p-8 border border-slate-800">
              <SlidersHorizontal className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-300">No Products Found</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">We couldn't find any products matching your filters. Try clearing some options or resetting filters.</p>
              <button
                onClick={handleReset}
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl text-xs transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => {
                  const discountPercent = p.mrp > p.lowestPrice
                    ? Math.round(((p.mrp - p.lowestPrice) / p.mrp) * 100)
                    : 0;

                  const image = p.variants.length
                    ? p.variants[0].images[0]
                    : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60";

                  return (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      className="glass-card rounded-2xl overflow-hidden flex flex-col h-full group"
                    >
                      <div className="relative aspect-square overflow-hidden bg-slate-950">
                        {discountPercent > 0 && (
                          <span className="absolute top-3 left-3 bg-red-600 text-white font-bold text-[10px] py-1 px-2.5 rounded-full z-10">
                            {discountPercent}% OFF
                          </span>
                        )}
                        {!p.inStock && (
                          <span className="absolute inset-0 bg-slate-950/80 text-rose-400 font-bold text-xs flex items-center justify-center z-10 backdrop-blur-[2px]">
                            OUT OF STOCK
                          </span>
                        )}
                        <img
                          src={image}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>

                      <div className="p-4 flex flex-col gap-2 flex-grow justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{p.brand}</span>
                          <h3 className="font-bold text-sm text-slate-200 mt-0.5 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                            {p.name}
                          </h3>
                          <div className="flex items-center gap-1 mt-1 text-amber-500">
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{p.avgRating.toFixed(1)}</span>
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-900/60">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold text-white">{formatINR(p.lowestPrice)}</span>
                            {p.mrp > p.lowestPrice && (
                              <span className="text-xs text-slate-500 line-through">{formatINR(p.mrp)}</span>
                            )}
                          </div>
                          <span className="text-[8px] font-semibold text-slate-500">INCL. GST</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    disabled={page === 1}
                    onClick={() => applyFilters({ page: page - 1 })}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs text-slate-400 font-semibold px-4">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => applyFilters({ page: page + 1 })}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MOBILE FILTERS SHEET - MODAL OVERLAY */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)}></div>
          <div className="relative w-80 bg-slate-950 h-full p-6 flex flex-col gap-6 shadow-2xl border-l border-slate-800 overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Filters</span>
              <button onClick={() => setMobileFiltersOpen(false)} className="text-slate-400 p-1">
                <X size={16} />
              </button>
            </div>

            {/* Mobile inputs duplicated for convenience */}
            <div className="flex flex-col gap-4 text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Keyword..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                >
                  <option value="">All Categories</option>
                  <option value="serums">Serums & Treatments</option>
                  <option value="moisturizers">Moisturizers</option>
                  <option value="cleansers">Cleansers</option>
                  <option value="sunprotection">Sun Protection</option>
                  <option value="masks">Masks & Exfoliants</option>
                  <option value="eyecare">Eye Care</option>
                  <option value="toners">Toners</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Price Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-center text-slate-300"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-center text-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
                <label className="text-xs text-slate-300" htmlFor="mobile_stock_check">
                  In Stock Only
                </label>
                <input
                  id="mobile_stock_check"
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={() => {
                  applyFilters({
                    search,
                    category,
                    min: minPrice,
                    max: maxPrice,
                    inStock: inStockOnly,
                  });
                  setMobileFiltersOpen(false);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-xs mt-4"
              >
                Apply All Filters
              </button>

              <button
                onClick={() => {
                  handleReset();
                  setMobileFiltersOpen(false);
                }}
                className="w-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white py-2.5 rounded-xl text-xs mt-2"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-6 py-4 animate-pulse">
        <div className="h-10 bg-slate-900 rounded-xl w-1/3 mb-4"></div>
        <div className="flex gap-8 items-start">
          <aside className="w-64 h-96 bg-slate-900 rounded-2xl hidden md:block"></aside>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-900/40 rounded-2xl border border-slate-800"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <ProductsCatalog />
    </Suspense>
  );
}
