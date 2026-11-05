"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { productApi } from "@/lib/api-client";
import Link from "next/link";
import { formatMoney } from "@repo/core";

interface Product {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  quantity: number;
  category?: string;
  sku?: string;
  images: Array<{ url: string; alt?: string }>;
  variants: Array<{ quantity: number }>;
  status: string;
  createdAt: string;
}

/** Total stock, summed across variants when the product has them. */
const stockOf = (p: Product) => (p.variants.length ? p.variants.reduce((n, v) => n + v.quantity, 0) : p.quantity);

export default function ProductsListPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadProducts();
  }, [token, router]);

  const loadProducts = async () => {
    try {
      const res = await productApi.list();
      setProducts(res.data);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await productApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setMessage({ type: "success", text: "Product deleted successfully" });
      setDeleteId(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete product" });
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="merchant-content mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage your product catalog
            </p>
          </div>
          <Link href="/products/new" className="btn-primary">
            ➕ Add Product
          </Link>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`px-4 py-3 rounded-lg mb-6 text-sm animate-slide-up ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.type === "success" ? "✅" : "❌"} {message.text}
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search products by name, category, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field max-w-md"
          />
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="px-6 py-16 text-center">
              <div className="inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 mt-3">
                Loading products...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-500 text-sm">
                {search
                  ? "No products match your search"
                  : "No products yet"}
              </p>
              {!search && (
                <Link
                  href="/products/new"
                  className="btn-primary mt-4 inline-flex"
                >
                  ➕ Add Your First Product
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          {product.images[0]?.url ? (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                              📷
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              /{product.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        {product.category ? (
                          <span className="badge badge-blue">
                            {product.category}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-sm font-semibold text-gray-900">
                        {formatMoney(product.priceCents)}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`badge ${
                            stockOf(product) === 0
                              ? "badge-red"
                              : stockOf(product) < 10
                              ? "badge-yellow"
                              : "badge-green"
                          }`}
                        >
                          {stockOf(product) === 0
                            ? "Out of stock"
                            : `${stockOf(product)} in stock${product.variants.length ? ` · ${product.variants.length} variants` : ""}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-gray-500 font-mono">
                        {product.sku || "—"}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors px-2 py-1 rounded hover:bg-brand-50"
                          >
                            Edit
                          </Link>
                          {deleteId === product.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors px-2 py-1 rounded hover:bg-red-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteId(null)}
                                className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors px-2 py-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteId(product.id)}
                              className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Count */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-gray-400 mt-4">
            Showing {filtered.length} of {products.length} products
          </p>
        )}
      </div>
    </div>
  );
}
