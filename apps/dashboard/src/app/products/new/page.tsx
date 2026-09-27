"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { productApi } from "@/lib/api-client";

export default function NewProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    price: "",
    quantity: "10",
    description: "",
    category: "",
    sku: "",
    imageUrl: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const images = form.imageUrl
        ? [{ url: form.imageUrl, alt: form.name }]
        : [];

      await productApi.create({
        name: form.name,
        price: form.price,
        quantity: form.quantity,
        description: form.description,
        category: form.category || undefined,
        sku: form.sku || undefined,
        images,
      });

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Product creation failed:", err);
      setError(err.response?.data?.error || "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 mb-2"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Add New Product
            </h1>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm animate-slide-up">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100"
        >
          {/* Product Info */}
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Product Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="input-field"
                placeholder="e.g. Artisan Espresso Blend"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="input-field resize-none"
                placeholder="Describe your product..."
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Pricing & Inventory
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  className="input-field"
                  placeholder="18.99"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.quantity}
                  onChange={(e) => updateField("quantity", e.target.value)}
                  className="input-field"
                  placeholder="10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="input-field"
                  placeholder="e.g. Coffee"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  SKU
                </label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                  className="input-field"
                  placeholder="e.g. ESP-001"
                />
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Product Image
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Image URL
              </label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => updateField("imageUrl", e.target.value)}
                className="input-field"
                placeholder="https://images.unsplash.com/..."
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Paste a direct link to your product image
              </p>
            </div>

            {form.imageUrl && (
              <div className="mt-3">
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="p-6 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Creating…
                </span>
              ) : (
                "Create Product"
              )}
            </button>
            <Link href="/dashboard" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
