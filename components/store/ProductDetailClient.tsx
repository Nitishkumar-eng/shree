"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Providers";
import { formatINR } from "@/lib/gst";
import { checkPincode } from "@/lib/pincodes";
import { 
  Heart, 
  ShoppingBag, 
  ChevronRight, 
  Truck, 
  Star, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  MapPin
} from "lucide-react";
import Link from "next/link";

interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  sku: string;
  price: number;
  mrp: number;
  stockQuantity: number;
  images: string[];
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string | Date;
  user: { name: string };
}

interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  category: { name: string };
  variants: Variant[];
  reviews: Review[];
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  brand: string;
  variants: Variant[];
}

export default function ProductDetailClient({ product, related }: { product: Product; related: RelatedProduct[] }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  // Variant States
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // Gallery States
  const [activeImage, setActiveImage] = useState("");
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ display: "none", transform: "scale(1)", left: 0, top: 0 });

  // Quantity State
  const [quantity, setQuantity] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  // Delivery check state
  const [pincode, setPincode] = useState("");
  const [pincodeInfo, setPincodeInfo] = useState<any>(null);

  // Extract unique colors and sizes available
  const colors = Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[];

  // Select initial variant
  useEffect(() => {
    if (product.variants.length > 0) {
      const initial = product.variants[0];
      setSelectedColor(initial.color);
      setSelectedSize(initial.size);
      setSelectedVariant(initial);
      if (initial.images.length > 0) {
        setActiveImage(initial.images[0]);
      }
    }
  }, [product]);

  // Update selected variant when color or size changes
  useEffect(() => {
    const match = product.variants.find(
      (v) => 
        (v.color === selectedColor || (!v.color && !selectedColor)) &&
        (v.size === selectedSize || (!v.size && !selectedSize))
    );

    if (match) {
      setSelectedVariant(match);
      if (match.images.length > 0) {
        setActiveImage(match.images[0]);
      }
      // Reset quantity to 1 if it exceeds stock of new variant
      setQuantity((prev) => Math.min(prev, match.stockQuantity || 1));
    } else {
      setSelectedVariant(null);
    }
  }, [selectedColor, selectedSize, product.variants]);

  // Image Hover Zoom logic
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      display: "block",
      transform: "scale(2.2)",
      left: `${x}%`,
      top: `${y}%`,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: "none", transform: "scale(1)", left: 0, top: 0 });
  };

  // Add to Cart Action
  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast("Please select a variant combination first", "error");
      return;
    }

    if (selectedVariant.stockQuantity < 1) {
      toast("This product combination is out of stock", "error");
      return;
    }

    setActionLoading(true);

    if (!session) {
      // Guest local storage cart management
      try {
        const guestCart = JSON.parse(localStorage.getItem("shree-guest-cart") || "[]");
        const existingIdx = guestCart.findIndex((i: any) => i.productVariantId === selectedVariant.id);
        
        if (existingIdx > -1) {
          const newQty = guestCart[existingIdx].quantity + quantity;
          if (newQty > selectedVariant.stockQuantity) {
            toast(`Only ${selectedVariant.stockQuantity} items in stock. Cannot add more.`, "error");
            setActionLoading(false);
            return;
          }
          guestCart[existingIdx].quantity = newQty;
        } else {
          guestCart.push({
            productVariantId: selectedVariant.id,
            quantity,
            name: product.name,
            size: selectedVariant.size,
            color: selectedVariant.color,
            price: selectedVariant.price,
            image: activeImage,
            brand: product.brand,
            stockQuantity: selectedVariant.stockQuantity,
          });
        }
        localStorage.setItem("shree-guest-cart", JSON.stringify(guestCart));
        window.dispatchEvent(new Event("shree-cart-update"));
        toast("Added to cart successfully (Guest Mode)", "success");
      } catch (e) {
        console.error(e);
        toast("Failed to add to cart", "error");
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // Authenticated cart database API call
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId: selectedVariant.id,
          quantity,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast("Added to cart successfully", "success");
        window.dispatchEvent(new Event("shree-cart-update"));
      } else {
        toast(data.error || "Failed to add to cart", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error dispatching request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Add to Wishlist Action
  const handleAddToWishlist = async () => {
    setActionLoading(true);

    if (!session) {
      // Guest wishlist
      try {
        const wishlist = JSON.parse(localStorage.getItem("shree-guest-wishlist") || "[]");
        if (wishlist.includes(product.id)) {
          toast("Item is already in your wishlist", "info");
        } else {
          wishlist.push(product.id);
          localStorage.setItem("shree-guest-wishlist", JSON.stringify(wishlist));
          window.dispatchEvent(new Event("shree-cart-update"));
          toast("Added to wishlist (Guest Mode)", "success");
        }
      } catch {
        toast("Failed to save wishlist", "error");
      } finally {
        setActionLoading(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      if (res.ok) {
        toast("Added to wishlist", "success");
        window.dispatchEvent(new Event("shree-cart-update"));
      } else {
        toast("Item already in wishlist", "info");
      }
    } catch {
      toast("Error saving item", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Delivery check handler
  const handlePincodeCheck = () => {
    if (!/^\d{6}$/.test(pincode)) {
      toast("Please enter a valid 6 digit pincode", "error");
      return;
    }
    const info = checkPincode(pincode);
    setPincodeInfo(info);
  };

  const avgRating = product.reviews.length
    ? product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length
    : 4.5;

  return (
    <div className="flex flex-col gap-12 py-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-indigo-400">Home</Link>
        <ChevronRight size={10} />
        <Link href="/products" className="hover:text-indigo-400">Products</Link>
        <ChevronRight size={10} />
        <span className="text-slate-300 truncate">{product.name}</span>
      </div>

      {/* Main product configuration screen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: Gallery & Zoom */}
        <div className="flex flex-col gap-4">
          <div
            className="relative overflow-hidden rounded-2xl aspect-square bg-slate-950 border border-slate-800 cursor-crosshair group"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <img
              src={activeImage || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60"}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-100"
            />
            {/* Zoom magnifier screen */}
            <div
              className="absolute w-24 h-24 border border-white/20 rounded-full shadow-2xl pointer-events-none bg-no-repeat bg-cover hidden group-hover:block"
              style={{
                backgroundImage: `url(${activeImage || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60"})`,
                backgroundPosition: `${zoomStyle.left} ${zoomStyle.top}`,
                backgroundSize: "400%",
                left: `calc(${zoomStyle.left} - 48px)`,
                top: `calc(${zoomStyle.top} - 48px)`,
              }}
            />
          </div>

          {/* Thumbnails */}
          {selectedVariant && selectedVariant.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto py-2">
              {selectedVariant.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 bg-slate-950 flex-shrink-0 transition-colors ${activeImage === img ? "border-indigo-500" : "border-slate-800 hover:border-slate-700"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product details and configuration panel */}
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">{product.brand}</span>
            <h1 className="text-3xl font-black text-white mt-1 leading-tight">{product.name}</h1>
            
            {/* Rating summary */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < Math.round(avgRating) ? "fill-current" : "text-slate-700"}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-400">{avgRating.toFixed(1)} rating</span>
              <span className="text-slate-700">|</span>
              <span className="text-xs text-slate-400">{product.reviews.length} customer reviews</span>
            </div>
          </div>

          {/* Price summary */}
          <div className="p-4 rounded-2xl glass-panel flex flex-col gap-2">
            {selectedVariant ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{formatINR(selectedVariant.price)}</span>
                  {selectedVariant.mrp > selectedVariant.price && (
                    <span className="text-sm text-slate-500 line-through">{formatINR(selectedVariant.mrp)}</span>
                  )}
                  {selectedVariant.mrp > selectedVariant.price && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 py-0.5 px-2 rounded-lg ml-2">
                      {Math.round(((selectedVariant.mrp - selectedVariant.price) / selectedVariant.mrp) * 100)}% OFF
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  <span>Price inclusive of GST & levies</span>
                  <span className="text-indigo-400">SKU: {selectedVariant.sku}</span>
                </div>
              </>
            ) : (
              <span className="text-slate-500 text-sm">Please select a size/color configuration to view pricing</span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs leading-relaxed text-slate-400">{product.description}</p>

          {/* Variant Selectors */}
          <div className="flex flex-col gap-4 border-t border-b border-slate-900/60 py-4">
            {/* Colors */}
            {colors.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Color: <span className="text-slate-200 capitalize font-medium">{selectedColor}</span></span>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-4 py-1.5 rounded-xl border text-xs font-semibold transition-all ${selectedColor === c ? "border-indigo-500 text-white bg-indigo-600/20" : "border-slate-800 text-slate-400 bg-slate-950/40 hover:border-slate-700"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Size: <span className="text-slate-200 capitalize font-medium">{selectedSize}</span></span>
                <div className="flex gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-4 py-1.5 rounded-xl border text-xs font-semibold transition-all ${selectedSize === s ? "border-indigo-500 text-white bg-indigo-600/20" : "border-slate-800 text-slate-400 bg-slate-950/40 hover:border-slate-700"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Purchase details & Add Buttons */}
          <div className="flex flex-col gap-4">
            {selectedVariant && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Stock Availability:</span>
                {selectedVariant.stockQuantity > 0 ? (
                  <span className="text-xs font-bold text-emerald-400">
                    {selectedVariant.stockQuantity} units in stock (Ready to dispatch)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-500">Out of Stock</span>
                )}
              </div>
            )}

            {selectedVariant && selectedVariant.stockQuantity > 0 && (
              <div className="flex items-center gap-3">
                {/* Quantity adjuster */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(quantity - 1)}
                    className="p-2 text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-bold text-white w-8 text-center">{quantity}</span>
                  <button
                    disabled={quantity >= selectedVariant.stockQuantity}
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={actionLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all glow-btn text-xs flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={14} /> Add to Shopping Bag
                </button>

                {/* Add to Wishlist */}
                <button
                  onClick={handleAddToWishlist}
                  disabled={actionLoading}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  <Heart size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Delivery Pincode Checker */}
          <div className="p-4 rounded-2xl glass-panel flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Truck size={14} className="text-indigo-400" /> Delivery Check
            </span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-300 placeholder-slate-600"
                />
                <MapPin className="absolute left-3.5 top-2.5 text-slate-600" size={14} />
              </div>
              <button
                onClick={handlePincodeCheck}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
              >
                Check
              </button>
            </div>
            {pincodeInfo && (
              <div className={`p-2.5 rounded-lg border text-[11px] ${pincodeInfo.serviceable ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-400" : "border-rose-500/20 bg-rose-950/20 text-rose-400"}`}>
                {pincodeInfo.serviceable ? (
                  <>
                    ✓ Serviceable in <strong>{pincodeInfo.city}, {pincodeInfo.state}</strong>. <br/>
                    Est. delivery: <strong>{pincodeInfo.deliveryDays} days</strong> | Shipping: <strong>₹{pincodeInfo.shippingFee}</strong>.
                  </>
                ) : (
                  "✗ Location currently not serviceable."
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products Grid */}
      {related.length > 0 && (
        <section className="flex flex-col gap-6 border-t border-slate-900/60 pt-10">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            <Sparkles size={16} className="text-indigo-400" /> You Might Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => {
              const price = p.variants.length ? p.variants[0].price : 0;
              const img = p.variants.length && p.variants[0].images.length ? p.variants[0].images[0] : "";
              
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="glass-card rounded-2xl overflow-hidden flex flex-col h-full group"
                >
                  <div className="aspect-square overflow-hidden bg-slate-950">
                    <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-4 flex flex-col gap-1 justify-between flex-grow">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">{p.brand}</span>
                      <h3 className="font-bold text-xs text-slate-200 mt-0.5 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                        {p.name}
                      </h3>
                    </div>
                    <span className="text-sm font-bold text-white mt-1">{formatINR(price)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Customer Reviews Section */}
      <section className="flex flex-col gap-6 border-t border-slate-900/60 pt-10">
        <h2 className="text-xl font-bold tracking-tight text-white">Verified Customer Reviews</h2>

        {product.reviews.length === 0 ? (
          <p className="text-xs text-slate-500">There are no reviews for this product yet. Purchase this item to write a review!</p>
        ) : (
          <div className="flex flex-col gap-4 max-w-2xl">
            {product.reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-xl glass-card flex flex-col gap-2 border border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">{r.user.name}</span>
                    {r.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck size={10} /> Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={i < r.rating ? "fill-current" : "text-slate-700"}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-400">{r.comment}</p>
                <span className="text-[10px] text-slate-600">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
