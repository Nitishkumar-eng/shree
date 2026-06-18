"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Providers";
import { formatINR } from "@/lib/gst";
import { Heart, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import Link from "next/link";

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    brand: string;
    slug: string;
    variants: Array<{
      id: string;
      size: string | null;
      color: string | null;
      price: number;
      stockQuantity: number;
      images: string[];
    }>;
  };
}

export default function WishlistPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch wishlist items
  const fetchWishlist = async () => {
    setLoading(true);
    if (!session) {
      // Guest Wishlist from localStorage
      try {
        const guestWish = JSON.parse(localStorage.getItem("dewkit-guest-wishlist") || "[]");
        if (guestWish.length === 0) {
          setWishlistItems([]);
          setLoading(false);
          return;
        }

        // Fetch products details for guest wishlist items
        const formatted: WishlistItem[] = [];
        for (const pid of guestWish) {
          // Fetch catalog item or mock
          const res = await fetch(`/api/products?limit=100`);
          if (res.ok) {
            const data = await res.json();
            const product = data.products.find((p: any) => p.id === pid);
            if (product) {
              formatted.push({
                id: pid,
                productId: pid,
                product: {
                  id: product.id,
                  name: product.name,
                  brand: product.brand,
                  slug: product.slug,
                  variants: product.variants,
                },
              });
            }
          }
        }
        setWishlistItems(formatted);
      } catch {
        setWishlistItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Authenticated wishlist from DB
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const data = await res.json();
        setWishlistItems(data);
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load wishlist", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [session]);

  // Merge guest wishlist on login
  useEffect(() => {
    const mergeWishlist = async () => {
      if (session) {
        const guestWish = JSON.parse(localStorage.getItem("dewkit-guest-wishlist") || "[]");
        if (guestWish.length > 0) {
          try {
            for (const pid of guestWish) {
              await fetch("/api/wishlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: pid }),
              });
            }
            localStorage.removeItem("dewkit-guest-wishlist");
            toast("Merged your guest wishlist into your account wishlist", "success");
            fetchWishlist();
          } catch (e) {
            console.error(e);
          }
        }
      }
    };
    mergeWishlist();
  }, [session]);

  // Remove Item
  const handleRemove = async (productId: string) => {
    if (!session) {
      try {
        const guestWish = JSON.parse(localStorage.getItem("dewkit-guest-wishlist") || "[]");
        const filtered = guestWish.filter((id: string) => id !== productId);
        localStorage.setItem("dewkit-guest-wishlist", JSON.stringify(filtered));
        toast("Removed item from wishlist", "success");
        window.dispatchEvent(new Event("dewkit-cart-update"));
        fetchWishlist();
      } catch {
        toast("Failed to remove item", "error");
      }
      return;
    }

    try {
      const res = await fetch(`/api/wishlist?productId=${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchWishlist();
        window.dispatchEvent(new Event("dewkit-cart-update"));
        toast("Removed item from wishlist", "success");
      } else {
        toast("Failed to remove item", "error");
      }
    } catch {
      toast("Error dispatching request", "error");
    }
  };

  // Move to Cart
  const handleMoveToCart = async (item: WishlistItem) => {
    const variant = item.product.variants.length ? item.product.variants[0] : null;
    if (!variant) return;

    if (variant.stockQuantity < 1) {
      toast("Item is currently out of stock", "error");
      return;
    }

    try {
      if (!session) {
        // Guest Cart
        const guestCart = JSON.parse(localStorage.getItem("dewkit-guest-cart") || "[]");
        const existing = guestCart.find((i: any) => i.productVariantId === variant.id);
        if (!existing) {
          guestCart.push({
            productVariantId: variant.id,
            quantity: 1,
            name: item.product.name,
            size: variant.size || "One Size",
            color: variant.color || "Standard",
            price: variant.price,
            image: variant.images[0] || "",
            brand: item.product.brand,
            stockQuantity: variant.stockQuantity,
          });
          localStorage.setItem("dewkit-guest-cart", JSON.stringify(guestCart));
        }
        
        // Remove from Guest Wishlist
        const guestWish = JSON.parse(localStorage.getItem("dewkit-guest-wishlist") || "[]");
        const filteredWish = guestWish.filter((id: string) => id !== item.productId);
        localStorage.setItem("dewkit-guest-wishlist", JSON.stringify(filteredWish));
        
        toast("Moved item to cart", "success");
        window.dispatchEvent(new Event("dewkit-cart-update"));
        fetchWishlist();
        return;
      }

      // Auth flow: POST to cart, DELETE from wishlist
      const cartRes = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId: variant.id, quantity: 1 }),
      });

      if (cartRes.ok) {
        await fetch(`/api/wishlist?productId=${item.productId}`, {
          method: "DELETE",
        });
        toast("Moved item to cart", "success");
        window.dispatchEvent(new Event("dewkit-cart-update"));
        fetchWishlist();
      }
    } catch {
      toast("Failed to move item to cart", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-10 items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-500">Syncing wishlist...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Heart className="text-indigo-400 fill-current" /> My Favorites
        </h1>
        <p className="text-xs text-slate-500 mt-1">Products you've saved to buy later</p>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl p-8 border border-slate-800">
          <Heart className="w-16 h-16 text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Your wishlist is empty</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">Tap the heart icon on any product to add it to your wishlist.</p>
          <Link
            href="/products"
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl text-xs transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlistItems.map((item) => {
            const variant = item.product.variants.length ? item.product.variants[0] : null;
            const price = variant ? variant.price : 0;
            const image = variant && variant.images.length
              ? variant.images[0]
              : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60";
            const inStock = variant ? variant.stockQuantity > 0 : false;

            return (
              <div
                key={item.id}
                className="glass-card rounded-2xl overflow-hidden flex flex-col h-full group"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-slate-950">
                  <button
                    onClick={() => handleRemove(item.productId)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors z-10"
                  >
                    <Trash2 size={12} />
                  </button>
                  {!inStock && (
                    <span className="absolute inset-0 bg-slate-950/80 text-rose-400 font-bold text-xs flex items-center justify-center z-10 backdrop-blur-[2px]">
                      OUT OF STOCK
                    </span>
                  )}
                  <img src={image} alt={item.product.name} className="w-full h-full object-cover" />
                </div>

                {/* Metadata */}
                <div className="p-4 flex flex-col gap-3 flex-grow justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">{item.product.brand}</span>
                    <h3 className="font-bold text-xs text-slate-200 mt-0.5 line-clamp-1">{item.product.name}</h3>
                    <span className="text-sm font-bold text-white mt-1.5 block">{formatINR(price)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t border-slate-900/60 pt-3">
                    <button
                      onClick={() => handleMoveToCart(item)}
                      disabled={!inStock}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:opacity-50 text-white font-semibold py-2 px-3 rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1"
                    >
                      <ShoppingBag size={10} /> Add to Bag
                    </button>
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
