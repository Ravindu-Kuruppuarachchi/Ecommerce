"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, MagnifyingGlass, ShoppingBag, X } from "@phosphor-icons/react/dist/ssr";
import { formatMoney } from "@repo/core";
import { API_URL } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { storeNavLinks } from "@/lib/nav";
import type { Product, PublicStore } from "@/lib/types";

function Search({ store, onDone }: { store: PublicStore; onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[] | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/products/store/${store.slug}/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        setResults(res.ok ? await res.json() : []);
      } catch {
        // Aborted by the next keystroke.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, store.slug]);

  return (
    <div className="border-t border-store-line bg-store-bg">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-8">
        <label htmlFor="store-search" className="sr-only">Search products</label>
        <input
          id="store-search"
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onDone()}
          placeholder="Search products"
          className="field"
        />
        {results && (
          <ul className="mt-3 max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <li className="py-3 text-sm text-store-muted">Nothing matches &ldquo;{query}&rdquo;.</li>
            ) : (
              results.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/${store.slug}/product/${p.slug}`}
                    onClick={onDone}
                    className="flex items-center gap-3 rounded-control px-2 py-2 hover:bg-store-surface"
                  >
                    {p.images[0] ? (
                      <img src={p.images[0].url} alt="" className="h-10 w-10 rounded-control object-cover" />
                    ) : (
                      <span className="h-10 w-10 rounded-control bg-store-surface" />
                    )}
                    <span className="flex-1 truncate text-sm text-store-fg">{p.name}</span>
                    <span className="text-sm text-store-muted">{formatMoney(p.priceCents, store.currency)}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function StoreHeader({ store }: { store: PublicStore }) {
  const cart = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const links = storeNavLinks(store);
  const style = store.theme?.headerStyle ?? "standard";

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const brand = (
    <Link href={`/${store.slug}`} className="flex min-w-0 items-center gap-3">
      {store.logo && <img src={store.logo} alt="" className="h-8 w-8 rounded-control object-contain" />}
      <span className={`truncate font-heading font-semibold tracking-tight ${style === "premium" ? "text-2xl" : "text-lg"}`}>
        {store.name}
      </span>
    </Link>
  );

  const nav = (
    <nav aria-label="Store" className="hidden items-center gap-7 md:flex">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`text-sm transition-colors hover:text-store-fg ${pathname === l.href ? "text-store-fg font-medium" : "text-store-muted"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );

  const actions = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setSearchOpen((v) => !v)}
        aria-expanded={searchOpen}
        aria-label="Search"
        className="rounded-control p-2.5 text-store-fg hover:bg-store-surface"
      >
        <MagnifyingGlass size={20} />
      </button>
      <button
        type="button"
        onClick={cart.open}
        aria-label={`Cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
        className="relative rounded-control p-2.5 text-store-fg hover:bg-store-surface"
      >
        <ShoppingBag size={20} />
        {cart.count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-store-accent px-1 text-[10px] font-semibold text-store-on-accent">
            {cart.count}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-label="Menu"
        className="rounded-control p-2.5 text-store-fg hover:bg-store-surface md:hidden"
      >
        {menuOpen ? <X size={20} /> : <List size={20} />}
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-store-line bg-store-bg">
      {style === "premium" ? (
        <div className="mx-auto grid h-[72px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-8">
          {nav}
          <div className="col-start-1 md:col-start-2">{brand}</div>
          <div className="col-start-3 justify-self-end">{actions}</div>
        </div>
      ) : (
        <div className={`mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-8 ${style === "minimal" ? "h-14" : "h-16"}`}>
          <div className="flex min-w-0 items-center gap-10">
            {brand}
            {style === "minimal" && nav}
          </div>
          {style === "standard" && nav}
          {actions}
        </div>
      )}

      {menuOpen && (
        <nav aria-label="Store" className="border-t border-store-line px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block rounded-control px-2 py-2.5 text-base text-store-fg hover:bg-store-surface">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
      {searchOpen && <Search store={store} onDone={() => setSearchOpen(false)} />}
    </header>
  );
}
