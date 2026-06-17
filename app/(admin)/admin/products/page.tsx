"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/Providers";
import { formatINR } from "@/lib/gst";
import { 
  Plus, 
  Edit, 
  Trash2, 
  ShoppingBag, 
  Layers, 
  Check, 
  X, 
  Image as ImageIcon,
  Tag
} from "lucide-react";

interface Variant {
  id?: string;
  size: string | null;
  color: string | null;
  sku: string;
  price: number;
  mrp: number;
  stockQuantity: number;
  images: string[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  categoryId: string;
  category: { name: string };
  isActive: boolean;
  hsnCode: string | null;
  gstRate: number;
  variants: Variant[];
}

interface Category {
  id: string;
  name: string;
}

export default function AdminProductsPage() {
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [hsnCode, setHsnCode] = useState("");
  const [gstRate, setGstRate] = useState(18);

  // Variants management inside form
  const [formVariants, setFormVariants] = useState<Variant[]>([]);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newMrp, setNewMrp] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/categories")
      ]);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
    } catch (err) {
      console.error(err);
      toast("Error loading catalog data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync slug helper
  useEffect(() => {
    if (!editingProduct) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  }, [name, editingProduct]);

  // Open Form for Adding
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName("");
    setSlug("");
    setBrand("Shree");
    setCategoryId(categories.length > 0 ? categories[0].id : "");
    setIsActive(true);
    setHsnCode("");
    setGstRate(18);
    setFormVariants([]);
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSlug(p.slug);
    setBrand(p.brand);
    setCategoryId(p.categoryId);
    setIsActive(p.isActive);
    setHsnCode(p.hsnCode || "");
    setGstRate(p.gstRate);
    setFormVariants(p.variants);
    setIsFormOpen(true);
  };

  // Add a variant draft into form list
  const handleAddVariantDraft = () => {
    if (!newSku.trim() || !newPrice || !newMrp || !newStock) {
      toast("Variant SKU, Price, MRP, and Stock are required", "error");
      return;
    }

    const priceNum = parseFloat(newPrice);
    const mrpNum = parseFloat(newMrp);
    const stockNum = parseInt(newStock);

    if (priceNum <= 0 || mrpNum <= 0 || stockNum < 0) {
      toast("Please enter valid positive pricing and non-negative stock values", "error");
      return;
    }

    const draft: Variant = {
      size: newSize.trim() || null,
      color: newColor.trim() || null,
      sku: newSku.trim().toUpperCase(),
      price: priceNum,
      mrp: mrpNum,
      stockQuantity: stockNum,
      images: newImageUrl.trim() ? [newImageUrl.trim()] : [
        // Generate random Unsplash high quality placeholder
        newColor.toLowerCase().includes("red")
          ? "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60"
          : "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60"
      ],
    };

    setFormVariants([...formVariants, draft]);
    // Reset variant fields
    setNewSize("");
    setNewColor("");
    setNewSku("");
    setNewPrice("");
    setNewMrp("");
    setNewStock("");
    setNewImageUrl("");
  };

  // Bulk Mock Image Upload Simulator for Cloudinary
  const handleMockCloudinaryUpload = () => {
    const urls = [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=60"
    ];
    const rand = urls[Math.floor(Math.random() * urls.length)];
    setNewImageUrl(rand);
    toast("Simulated secure bulk image upload to Cloudinary!", "success");
  };

  const handleRemoveVariantDraft = (idx: number) => {
    setFormVariants(formVariants.filter((_, i) => i !== idx));
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast("Product deleted successfully", "success");
        loadData();
      } else {
        const data = await res.json();
        toast(data.error || "Delete failed", "error");
      }
    } catch {
      toast("Network error during delete", "error");
    }
  };

  // Submit Product Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim() || !brand.trim() || !categoryId) {
      toast("Please enter all required fields", "error");
      return;
    }

    const payload = {
      name,
      slug,
      description: "Premium e-commerce catalog item by Shree Retail. High reliability and quality engineering built in India.",
      brand,
      categoryId,
      isActive,
      hsnCode: hsnCode.trim() || null,
      gstRate: parseFloat(gstRate.toString()),
      variants: formVariants,
    };

    try {
      let res;
      if (editingProduct) {
        // Edit base details
        res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create product + variants
        res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        toast(editingProduct ? "Product details updated" : "Product created successfully", "success");
        setIsFormOpen(false);
        loadData();
      } else {
        toast(data.error || "Operation failed", "error");
      }
    } catch {
      toast("Error submitting form", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-10 items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-500">Retrieving catalog records...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingBag className="text-indigo-400" /> Catalog Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage platform products, variants, pricing matrices, and categories</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all flex items-center gap-1.5 glow-btn"
        >
          <Plus size={14} /> Add Product
        </button>
      </div>

      {/* Main product catalog list - Table view */}
      {!isFormOpen && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-400 border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 uppercase text-[9px] tracking-wider">
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Variants</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No products added to catalog. Click "Add Product" to create one.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/10 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200 text-sm">{p.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">{p.slug}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-300">{p.brand}</td>
                    <td className="py-4 px-4 text-slate-400">{p.category?.name || "Uncategorized"}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-indigo-400">
                        {p.variants.length} SKU(s)
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {p.isActive ? (
                        <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-indigo-400 transition-colors"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Product ADD/EDIT Form Overlay */}
      {isFormOpen && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-200">
              {editingProduct ? `Edit Product: ${editingProduct.name}` : "Create New Product with Variants"}
            </h3>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-slate-300">
            {/* General Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shree Strider Pro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">URL Slug (Auto Generated) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. shree-strider-pro"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Brand *</label>
                <input
                  type="text"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-300"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">HSN Code (For GST Invoice)</label>
                <input
                  type="text"
                  placeholder="e.g. 64041190"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">GST Tax Rate (%)</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-300"
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5% (Apparel below ₹1000)</option>
                  <option value={12}>12% (Apparel / Shoes above ₹1000)</option>
                  <option value={18}>18% (Standard Electronics)</option>
                  <option value={28}>28% (Luxury items)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_check"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="is_active_check" className="text-xs text-slate-400">Make this product active immediately</label>
            </div>

            {/* VARIANTS AND PRICING MATRIX FORM */}
            <div className="border-t border-slate-900 pt-6">
              <span className="text-xs font-bold text-white uppercase tracking-wider block mb-4 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-400" /> Product SKU Variants
              </span>

              {/* Variant Draft Adder */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-900 flex flex-col gap-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Size (e.g. S, UK 8)"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Color (e.g. Red)"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="SKU ID (e.g. SH-STRD-RD8)"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Selling Price (₹)"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="MRP Retail Price (₹)"
                    value={newMrp}
                    onChange={(e) => setNewMrp(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Stock Qty"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                  />
                  
                  {/* Image input with mock Cloudinary upload */}
                  <div className="sm:col-span-2 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Image URL..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleMockCloudinaryUpload}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 p-2 rounded-lg"
                      title="Upload to Cloudinary"
                    >
                      <ImageIcon size={14} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariantDraft}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-1.5 px-4 rounded-lg text-xs font-semibold self-end transition-colors"
                >
                  Add Variant to Table
                </button>
              </div>

              {/* Form Variant Draft list table */}
              <div className="border border-slate-900 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-400 border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-850 text-[9px] uppercase font-bold tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Size/Color</th>
                      <th className="py-2.5 px-3">Price (₹)</th>
                      <th className="py-2.5 px-3">MRP (₹)</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formVariants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                          No variants drafted. Add at least one variant combination.
                        </td>
                      </tr>
                    ) : (
                      formVariants.map((v, i) => (
                        <tr key={i} className="border-b border-slate-900/60 last:border-0">
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-300">{v.sku}</td>
                          <td className="py-2.5 px-3">
                            {v.size || "Std"} / {v.color || "Std"}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{formatINR(v.price)}</td>
                          <td className="py-2.5 px-3 line-through text-[10px] text-slate-500">{formatINR(v.mrp)}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300 font-bold">{v.stockQuantity}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveVariantDraft(i)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end mt-4 border-t border-slate-900 pt-6">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="py-2.5 px-5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formVariants.length === 0}
                className="py-2.5 px-6 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {editingProduct ? "Save Product Settings" : "Save and Deploy Product"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
