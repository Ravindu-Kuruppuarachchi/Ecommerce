"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, MagnifyingGlass, ShoppingBag, UserCircle, X } from "@phosphor-icons/react/dist/ssr";
import { formatMoney } from "@repo/core";
import { schemeStyle } from "@/lib/theme";
import { API_URL } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { storeNavLinks } from "@/lib/nav";
import type { Product, PublicStore } from "@/lib/types";

function Search({ store, onDone }: { store: PublicStore; onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setStatus("idle");
      return;
    }
    setResults(null);
    setStatus("loading");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/products/store/${store.slug}/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Search unavailable");
        const products = await res.json();
        if (!controller.signal.aborted) { setResults(products); setStatus("ready"); }
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, store.slug, attempt]);

  return (
    <div className="border-t border-store-line bg-store-bg">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        <div className="mb-4 flex items-center justify-between"><p className="font-heading text-lg font-semibold">Find your next favourite</p><button type="button" onClick={onDone} aria-label="Close search" className="rounded-control p-2 hover:bg-store-surface"><X size={20} /></button></div>
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
        {status === "loading" && <p className="py-5 text-sm text-store-muted" role="status">Searching products…</p>}
        {status === "error" && <div className="py-5 text-sm" role="alert"><p>Search is unavailable right now.</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-2 underline underline-offset-4">Try again</button></div>}
        {!query && <p className="pt-4 text-sm text-store-muted">Search by product name, category or a detail you have in mind.</p>}
        {results && (
          <ul className="mt-4 grid max-h-[50dvh] gap-2 overflow-y-auto sm:grid-cols-2" aria-label="Search results">
            {results.length === 0 ? (
              <li className="col-span-full py-5 text-sm text-store-muted" role="status">No matches for &ldquo;{query}&rdquo;. Try a product name or a broader search.</li>
            ) : (
              results.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/${store.slug}/product/${p.slug}`}
                    onClick={onDone}
                    className="flex items-center gap-3 rounded-control px-2 py-2 hover:bg-store-surface"
                  >
                    {p.images[0] ? (
                      <img src={p.images[0].url} alt="" className="h-16 w-14 rounded-control object-cover" />
                    ) : (
                      <span className="h-16 w-14 rounded-control bg-store-surface" />
                    )}
                    <span className="min-w-0 flex-1"><span className="block text-sm text-store-fg">{p.name}</span>{p.category && <span className="mt-1 block text-xs text-store-muted">{p.category}</span>}</span>
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
      <span className={`truncate font-heading font-semibold tracking-tight ${style === "premium" ? "text-xl md:text-3xl" : "text-xl sm:text-2xl"}`}>
        {store.name}
      </span>
    </Link>
  );

  const nav = (
    <nav aria-label="Store" className="hidden min-w-0 items-center gap-5 overflow-x-auto whitespace-nowrap md:flex">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={pathname === l.href ? "page" : undefined}
          className={`shrink-0 ${style === "contrast" || style === "department" ? "text-xs font-semibold uppercase tracking-wide" : "text-sm"} transition-colors hover:text-store-fg ${pathname === l.href ? "text-store-fg font-medium" : "text-store-muted"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );

  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      <Link href={`/${store.slug}/account`} aria-label="My account" className="rounded-control p-2.5 text-store-fg hover:bg-store-surface"><UserCircle size={20} /></Link>
      <button
        type="button"
        onClick={() => { setSearchOpen((v) => !v); setMenuOpen(false); }}
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
        onClick={() => { setMenuOpen((v) => !v); setSearchOpen(false); }}
        aria-expanded={menuOpen}
        data-demo-control="true"
        aria-label="Menu"
        className="rounded-control p-2.5 text-store-fg hover:bg-store-surface md:hidden"
      >
        {menuOpen ? <X size={20} /> : <List size={20} />}
      </button>
    </div>
  );

  return (
    <header style={style === "contrast" ? schemeStyle(store.theme, "inverse") : undefined} className="sticky top-0 z-30 border-b border-store-line bg-store-bg text-store-fg">
      {style === "department" ? <>
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-4 sm:px-8">
          {brand}
          <button type="button" aria-label="Search products" aria-expanded={searchOpen} onClick={() => setSearchOpen((value) => !value)} className="hidden w-full max-w-lg items-center justify-between rounded-control border border-store-line px-5 py-3 text-sm text-store-muted md:flex">Search products <MagnifyingGlass size={19} /></button>
          {actions}
        </div>
        <div className="hidden border-t border-store-line px-8 py-4 md:block"><div className="mx-auto max-w-7xl">{nav}</div></div>
      </> : style === "premium" ? (
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-8 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
          {nav}
          <div className="min-w-0 md:col-start-2">{brand}</div>
          <div className="shrink-0 justify-self-end md:col-start-3">{actions}</div>
        </div>
      ) : (
        <div className={`mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-8 ${style === "minimal" ? "h-16" : "h-20"}`}>
          <div className="flex min-w-0 items-center gap-10">
            {brand}
            {style === "minimal" && nav}
          </div>
          {(style === "standard" || style === "contrast") && nav}
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
