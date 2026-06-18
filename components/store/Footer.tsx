import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 mt-auto py-12 px-6 pb-24 md:pb-12 text-slate-400">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <span className="text-xl font-black bg-gradient-to-r from-rose-400 to-pink-500 bg-clip-text text-transparent tracking-widest">
            DEWKIT
          </span>
          <p className="text-xs leading-relaxed text-slate-500">
            Dewkit — premium skincare products crafted for healthy, glowing skin. Driven by transparency, natural ingredients, and dermatologist-tested science.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-4">Quick Links</h4>
          <ul className="flex flex-col gap-2.5 text-xs">
            <li>
              <Link href="/products" className="hover:text-indigo-400 transition-colors">
                Shop Catalog
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-indigo-400 transition-colors">
                Shopping Cart
              </Link>
            </li>
            <li>
              <Link href="/wishlist" className="hover:text-indigo-400 transition-colors">
                My Wishlist
              </Link>
            </li>
            <li>
              <Link href="/orders" className="hover:text-indigo-400 transition-colors">
                Track Orders
              </Link>
            </li>
          </ul>
        </div>

        {/* Policies */}
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-4">GST & Payments</h4>
          <ul className="flex flex-col gap-2.5 text-xs text-slate-500">
            <li>Secure UPI & Card checkout via Razorpay</li>
            <li>18% standard GST inclusive pricing</li>
            <li>Automatic HSN-coded PDF tax invoice</li>
            <li>Easy returns within 7 days of delivery</li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-4">Contact Info</h4>
          <ul className="flex flex-col gap-2.5 text-xs text-slate-500">
            <li>Email: support@dewkit.in</li>
            <li>Phone: +91 98765 43210</li>
            <li>Corporate HQ: HSR Layout, Bengaluru, Karnataka, India - 560102</li>
          </ul>
        </div>
      </div>

      <div className="container mx-auto border-t border-slate-900/60 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-600">
        <p>© {new Date().getFullYear()} Dewkit Skincare Private Limited. All rights reserved.</p>
        <p>Designed and built in India for local commerce.</p>
      </div>
    </footer>
  );
}
