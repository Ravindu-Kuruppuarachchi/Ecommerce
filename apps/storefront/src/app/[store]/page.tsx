"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import StorefrontHeader from "@/components/StorefrontHeader";
import ProductCard from "@/components/ProductCard";
import Cart from "@/components/Cart";
import { cartKey, type CartItem } from "@/lib/cart";

// ============ TYPES ============

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

export default function StorePage() {
  const params = useParams();
  const router = useRouter();
  const storeSlug = params.store as string;

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Fetch store and products
  useEffect(() => {
    if (!storeSlug) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [storeRes, productsRes] = await Promise.all([
          fetch(`${API_URL}/stores/${storeSlug}`),
          fetch(`${API_URL}/products/store/${storeSlug}`),
        ]);
        if (!storeRes.ok) { setError("Store not found"); return; }
        setStore(await storeRes.json());
        setProducts(productsRes.ok ? await productsRes.json() : []);
      } catch { setError("Failed to load store"); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [storeSlug]);

  // Load cart from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(cartKey(storeSlug));
    if (saved) setCartItems(JSON.parse(saved));
  }, [storeSlug]);

  // Persist cart
  useEffect(() => {
    if (storeSlug) localStorage.setItem(cartKey(storeSlug), JSON.stringify(cartItems));
  }, [cartItems, storeSlug]);

  // Apply theme
  useEffect(() => {
    if (!store?.theme) return;
    const root = document.documentElement;
    root.style.setProperty("--store-primary", store.theme.primaryColor);
    root.style.setProperty("--store-secondary", store.theme.secondaryColor);
    root.style.setProperty("--store-accent", store.theme.accentColor);
    if (store.theme.fontFamily) root.style.setProperty("--store-font", `'${store.theme.fontFamily}', system-ui, sans-serif`);
  }, [store?.theme]);

  // Cart functions
  const addToCart = useCallback((product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: product.id, name: product.name, priceCents: product.priceCents, quantity: 1, image: product.images[0]?.url }];
    });
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateCartQuantity = useCallback((id: string, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCartItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  }, [removeFromCart]);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const filteredProducts = activeCategory ? products.filter((p) => p.category === activeCategory) : products;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center animate-fade-in">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 text-sm mt-4">Loading store…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center animate-fade-in">
        <p className="text-6xl mb-4">🏪</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h1>
        <p className="text-gray-500">The store &ldquo;{storeSlug}&rdquo; doesn&apos;t exist or has been removed.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <StorefrontHeader store={store} cartCount={cartCount} onCartClick={() => setIsCartOpen(!isCartOpen)} storeSlug={storeSlug} />

      {/* Hero Section */}
      <section className="hero-section py-20 px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">{store?.name}</h2>
          {store?.description && <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto">{store.description}</p>}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:-translate-y-px hover:shadow-lg"
              style={{ backgroundColor: "var(--store-accent)", color: "white" }}>
              Shop Now →
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main id="products-section" className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex gap-10">
          <div className="flex-1">
            {/* Section Title */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Our Products</h3>
              <span className="text-sm text-gray-400">{filteredProducts.length} products</span>
            </div>

            {/* Category Filters */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                <button onClick={() => setActiveCategory(null)} className={`category-pill ${!activeCategory ? "active" : ""}`}>All</button>
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)} className={`category-pill ${activeCategory === cat ? "active" : ""}`}>{cat}</button>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🛍️</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No products yet</h3>
                <p className="text-gray-500">Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onAddToCart={addToCart} storeSlug={storeSlug} />
                ))}
              </div>
            )}
          </div>

          {/* Desktop Cart */}
          <div className="hidden xl:block w-80 shrink-0">
            <div className="sticky top-24">
              <Cart items={cartItems} onRemove={removeFromCart} onUpdateQuantity={updateCartQuantity} storeSlug={storeSlug} />
              {cartItems.length > 0 && (
                <button onClick={() => router.push(`/${storeSlug}/checkout`)}
                  className="w-full mt-3 px-4 py-3 rounded-xl font-semibold text-sm border-2 transition-all hover:-translate-y-px"
                  style={{ borderColor: "var(--store-accent)", color: "var(--store-accent)" }}>
                  Proceed to Checkout →
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Cart Overlay */}
      {isCartOpen && (
        <div className="xl:hidden">
          <div className="cart-overlay" onClick={() => setIsCartOpen(false)} />
          <div className="cart-panel">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Shopping Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-500 hover:text-gray-700 text-xl p-1">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <Cart items={cartItems} onRemove={removeFromCart} onUpdateQuantity={updateCartQuantity} storeSlug={storeSlug} />
            </div>
            {cartItems.length > 0 && (
              <div className="p-4 border-t">
                <button onClick={() => { setIsCartOpen(false); router.push(`/${storeSlug}/checkout`); }} className="btn-checkout">Proceed to Checkout</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{store?.name}</h3>
              {store?.description && <p className="text-gray-500 text-sm leading-relaxed max-w-md">{store.description}</p>}
              {/* Newsletter */}
              <div className="mt-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">Stay in the loop</p>
                <div className="flex gap-2 max-w-sm">
                  <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  <button className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-px" style={{ backgroundColor: "var(--store-accent)" }}>Subscribe</button>
                </div>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Shop</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><button onClick={() => { setActiveCategory(null); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); }} className="hover:text-gray-700 transition-colors">All Products</button></li>
                {categories.slice(0, 4).map((cat) => (
                  <li key={cat}><button onClick={() => { setActiveCategory(cat); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); }} className="hover:text-gray-700 transition-colors">{cat}</button></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Info</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="hover:text-gray-700 transition-colors cursor-pointer">About Us</li>
                <li className="hover:text-gray-700 transition-colors cursor-pointer">Shipping Policy</li>
                <li className="hover:text-gray-700 transition-colors cursor-pointer">Return Policy</li>
                <li className="hover:text-gray-700 transition-colors cursor-pointer">Contact Us</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-8 pt-8 text-center text-xs text-gray-400">
            <p>© {new Date().getFullYear()} {store?.name}. All rights reserved. Powered by <span className="font-semibold text-gray-500">ShopHub</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
