"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { productApi } from "@/lib/api-client";
import Link from "next/link";
import { toMajorString } from "@repo/core";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    price: "",
    quantity: "0",
    description: "",
    category: "",
    sku: "",
    imageUrl: "",
  });

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadProduct();
  }, [token, router, productId]);

  const loadProduct = async () => {
    try {
      const res = await productApi.get(productId);
      const p = res.data;
      setForm({
        name: p.name || "", price: toMajorString(p.priceCents ?? 0),
        quantity: String(p.quantity || 0), description: p.description || "",
        category: p.category || "", sku: p.sku || "",
        imageUrl: p.images?.[0]?.url || "",
      });
    } catch { setError("Product not found"); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setIsSubmitting(true);
    try {
      await productApi.update(productId, {
        name: form.name, price: form.price, quantity: form.quantity,
        description: form.description,
        category: form.category || undefined, sku: form.sku || undefined,
      });
      setSuccess("Product updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update product");
    } finally { setIsSubmitting(false); }
  };

  if (!token) return null;
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/products" className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 mb-2">← Back to Products</Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">❌ {error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-6 text-sm">✅ {success}</div>}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Product Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
              <input type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="input-field resize-none" />
            </div>
          </div>

          <div className="p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Pricing & Inventory</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price ($) *</label>
                <input type="number" step="0.01" min="0" required value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity *</label>
                <input type="number" min="0" required value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <input type="text" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
                <input type="text" value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} className="input-field" />
              </div>
            </div>
          </div>

          {form.imageUrl && (
            <div className="p-6">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Current Image</p>
              <img src={form.imageUrl} alt="Product" className="w-24 h-24 object-cover rounded-lg border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}

          <div className="p-6 flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Saving…</span> : "Save Changes"}
            </button>
            <Link href="/products" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
