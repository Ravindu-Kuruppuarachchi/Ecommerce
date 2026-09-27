"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatMoney } from "@repo/core";

interface Store {
  name: string;
  slug?: string;
  logo?: string;
  description?: string;
}

interface StorefrontHeaderProps {
  store: Store | null;
  cartCount: number;
  onCartClick: () => void;
  storeSlug?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function StorefrontHeader({ store, cartCount, onCartClick, storeSlug }: StorefrontHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const slug = storeSlug || store?.slug;

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !slug) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/products/store/${slug}/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } catch {} finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, slug]);

  return (
    <>
      {/* Announcement Bar */}
      <div className="w-full text-center py-2 px-4 text-xs font-medium" style={{ backgroundColor: "var(--store-accent)", color: "white" }}>
        🎉 Free shipping on orders over $50 • Use code <strong>WELCOME10</strong> for 10% off
      </div>

      <header className="store-header sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {store?.logo && <img src={store.logo} alt={store.name} className="h-10 w-10 object-contain rounded-lg" />}
            <div>
              {slug ? (
                <Link href={`/${slug}`} className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
                  {store?.name || "Store"}
                </Link>
              ) : (
                <h1 className="text-xl font-bold tracking-tight">{store?.name || "Store"}</h1>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div ref={searchRef} className="relative">
              <button onClick={() => setSearchOpen(!searchOpen)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
                style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Search</span>
              </button>

              {searchOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-100">
                    <input type="text" autoFocus placeholder="Search products..." value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-900" />
                  </div>
                  {query.trim() && (
                    <div className="max-h-64 overflow-y-auto">
                      {isSearching ? (
                        <div className="px-4 py-6 text-center text-gray-400 text-sm">Searching...</div>
                      ) : results.length === 0 ? (
                        <div className="px-4 py-6 text-center text-gray-400 text-sm">No results for &ldquo;{query}&rdquo;</div>
                      ) : (
                        results.map((p) => (
                          <Link key={p.id} href={`/${slug}/product/${p.slug}`} onClick={() => setSearchOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                            {p.images?.[0]?.url && <img src={p.images[0].url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-400">{formatMoney(p.priceCents)}</p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <button onClick={onCartClick}
              className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Cart
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
