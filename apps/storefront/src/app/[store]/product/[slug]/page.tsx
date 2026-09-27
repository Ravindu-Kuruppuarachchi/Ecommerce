"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StorefrontHeader from "@/components/StorefrontHeader";
import ProductCard from "@/components/ProductCard";
import { formatMoney } from "@repo/core";
import { cartKey } from "@/lib/cart";

interface StoreTheme {
  primaryColor: string; secondaryColor: string;
  accentColor: string; fontFamily: string; headerStyle: string;
}
interface Store {
  id: string; name: string; slug: string;
  description?: string; logo?: string; theme?: StoreTheme;
}
interface Product {
  id: string; name: string; slug: string; priceCents: number;
  quantity: number; description?: string; category?: string;
  images: Array<{ url: string; alt?: string }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeSlug = params.store as string;
  const productSlug = params.slug as string;

  const [store, setStore] = useState<Store | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (!storeSlug || !productSlug) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [storeRes, productRes] = await Promise.all([
          fetch(`${API_URL}/stores/${storeSlug}`),
          fetch(`${API_URL}/products/store/${storeSlug}/${productSlug}`),
        ]);
        if (!storeRes.ok || !productRes.ok) { setError("Product not found"); return; }
        const storeData = await storeRes.json();
        const productData = await productRes.json();
        setStore(storeData);
        setProduct(productData.product);
        setRelatedProducts(productData.relatedProducts || []);
      } catch { setError("Failed to load product"); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [storeSlug, productSlug]);

  useEffect(() => {
    if (!store?.theme) return;
    const root = document.documentElement;
    root.style.setProperty("--store-primary", store.theme.primaryColor);
    root.style.setProperty("--store-secondary", store.theme.secondaryColor);
    root.style.setProperty("--store-accent", store.theme.accentColor);
    if (store.theme.fontFamily) {
      root.style.setProperty("--store-font", `'${store.theme.fontFamily}', system-ui, sans-serif`);
    }
  }, [store?.theme]);

  const handleAddToCart = () => {
    // Store in localStorage for cross-page cart
    const cart = JSON.parse(localStorage.getItem(cartKey(storeSlug)) || "[]");
    const existing = cart.findIndex((i: any) => i.id === product!.id);
    if (existing >= 0) {
      cart[existing].quantity += qty;
    } else {
      cart.push({
        id: product!.id, name: product!.name, priceCents: product!.priceCents,
        quantity: qty, image: product!.images[0]?.url,
      });
    }
    localStorage.setItem(cartKey(storeSlug), JSON.stringify(cart));
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
    </div>
  );

  if (error || !product) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
        <button onClick={() => router.push(`/${storeSlug}`)} className="btn-cart mt-4 max-w-xs mx-auto">← Back to Store</button>
      </div>
    </div>
  );

  const isOutOfStock = product.quantity === 0;
  const images = product.images.length > 0 ? product.images : [{ url: "", alt: "No image" }];

  return (
    <div className="min-h-screen bg-gray-50">
      <StorefrontHeader store={store} cartCount={0} onCartClick={() => router.push(`/${storeSlug}`)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-8">
          <button onClick={() => router.push(`/${storeSlug}`)} className="hover:text-gray-700 transition-colors">{store?.name}</button>
          <span className="mx-2">/</span>
          {product.category && (<><span className="text-gray-400">{product.category}</span><span className="mx-2">/</span></>)}
          <span className="text-gray-900 font-medium">{product.name}</span>
        </nav>

        {/* Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 aspect-square">
              {images[selectedImage]?.url ? (
                <img src={images[selectedImage].url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 mt-4">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === i ? "border-gray-900 shadow-md" : "border-gray-200 opacity-60 hover:opacity-100"}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {product.category && <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">{product.category}</span>}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-bold" style={{ color: "var(--store-accent)" }}>{formatMoney(product.priceCents)}</span>
              {!isOutOfStock && <span className="text-sm text-gray-400">{product.quantity} in stock</span>}
            </div>

            {product.description && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {isOutOfStock ? (
              <div className="bg-gray-100 rounded-xl px-6 py-4 text-center">
                <p className="text-gray-500 font-semibold">Currently out of stock</p>
                <p className="text-gray-400 text-sm mt-1">Check back soon for availability</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Quantity Selector */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-lg transition-colors">−</button>
                    <span className="w-12 text-center text-lg font-semibold">{qty}</span>
                    <button onClick={() => setQty(Math.min(product.quantity, qty + 1))} className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-lg transition-colors">+</button>
                  </div>
                </div>

                <button onClick={handleAddToCart} className="btn-cart text-base py-4">
                  {addedToCart ? "✓ Added to Cart!" : `Add to Cart — ${formatMoney(product.priceCents * qty)}`}
                </button>
              </div>
            )}

            {/* Trust Signals */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { icon: "🚚", label: "Free Shipping", sub: "On orders $50+" },
                { icon: "🔒", label: "Secure Checkout", sub: "SSL encrypted" },
                { icon: "↩️", label: "Easy Returns", sub: "30-day policy" },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl mb-1">{item.icon}</p>
                  <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">You Might Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <div key={p.id} onClick={() => router.push(`/${storeSlug}/product/${p.slug}`)} className="cursor-pointer">
                  <ProductCard product={p} onAddToCart={() => {}} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-gray-200 mt-16 py-8 px-8 bg-white">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          <p>Powered by <span className="font-semibold text-gray-700">ShopHub</span> • {store?.name}</p>
        </div>
      </footer>
    </div>
  );
}
