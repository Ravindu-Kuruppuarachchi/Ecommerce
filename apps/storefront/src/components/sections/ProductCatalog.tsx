"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass, SlidersHorizontal, X } from "@phosphor-icons/react/dist/ssr";
import { filterCatalog, type CatalogSort } from "@repo/core";
import ProductCard from "../ProductCard";
import type { Product } from "@/lib/types";

export default function ProductCatalog({ products, storeSlug, currency, quickAdd, props, preview, category }: {
  products: Product[]; storeSlug: string; currency: string; quickAdd: boolean;
  props: Record<string, unknown>; preview: boolean; category?: string;
}) {
  const id = useId();
  const [previewCategory, setPreviewCategory] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CatalogSort>("featured");
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const fixedCategory = typeof props.category === "string" ? props.category.trim() : "";
  const localNavigation = preview || storeSlug === "template-demo";
  const active = fixedCategory || (localNavigation ? previewCategory : category);
  const categories = [...new Map(products.filter(p => p.category).map(p => [p.category!.toLowerCase(), p.category!])).values()].sort();
  const tools = props.showTools !== false;
  const visible = useMemo(() => filterCatalog(products, { category: active, ...(tools && { query, sort, inStock, onSale }) }), [products, active, tools, query, sort, inStock, onSale]);
  const filtered = tools && Boolean(query || inStock || onSale);
  const clear = () => { setQuery(""); setInStock(false); setOnSale(false); };
  const columns = props.columns === "2" ? "md:grid-cols-2" : props.columns === "3" ? "md:grid-cols-3" : "md:grid-cols-3 lg:grid-cols-4";
  const link = (label: string, value?: string) => {
    const selected = (active || "").toLowerCase() === (value || "").toLowerCase();
    return <Link key={value ?? "all-products"} href={`/${storeSlug}/products${value ? `?category=${encodeURIComponent(value)}` : ""}`} onClick={event => { if (localNavigation) { event.preventDefault(); setPreviewCategory(value); } }} aria-current={selected ? "page" : undefined} className={`shrink-0 border-b-2 px-1 py-3 text-sm transition-colors ${selected ? "border-store-fg font-semibold text-store-fg" : "border-transparent text-store-muted hover:text-store-fg"}`}>{label}</Link>;
  };
  return <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-8 md:pt-16">
    <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight md:text-6xl">{fixedCategory ? (typeof props.heading === "string" ? props.heading : fixedCategory) : active ?? (typeof props.heading === "string" ? props.heading : "All products")}</h1>
    {typeof props.description === "string" && props.description && <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-store-muted md:text-base">{props.description}</p>}
    {!fixedCategory && props.showCategories !== false && categories.length > 1 && <nav data-demo-control="true" aria-label="Categories" className="mt-7 flex gap-6 overflow-x-auto border-b border-store-line">{link("All products")}{categories.map(value => link(value, value))}</nav>}
    {tools && <div data-demo-control="true" className="mt-8 space-y-4 border-b border-store-line pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 sm:w-full sm:max-w-md">
          <MagnifyingGlass size={19} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-store-muted" />
          <label htmlFor={`${id}-search`} className="sr-only">Search this collection</label>
          <input id={`${id}-search`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find something you love" className="field !pl-11" />
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor={`${id}-sort`} className="shrink-0 text-sm text-store-muted">Sort by</label>
          <select id={`${id}-sort`} value={sort} onChange={event => setSort(event.target.value as CatalogSort)} className="field min-w-0 sm:!w-48">
            <option value="featured">Newest first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A to Z</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        <SlidersHorizontal size={18} aria-hidden="true" className="text-store-muted" />
        <label className="inline-flex min-h-8 cursor-pointer items-center gap-2"><input type="checkbox" checked={inStock} onChange={event => setInStock(event.target.checked)} className="h-4 w-4 accent-current" />In stock</label>
        <label className="inline-flex min-h-8 cursor-pointer items-center gap-2"><input type="checkbox" checked={onSale} onChange={event => setOnSale(event.target.checked)} className="h-4 w-4 accent-current" />On sale</label>
        {filtered && <button type="button" onClick={clear} className="inline-flex min-h-8 items-center gap-1 text-store-muted underline underline-offset-4">Clear filters <X size={13} /></button>}
        <p className="ml-auto text-xs tabular-nums text-store-muted" role="status">{visible.length} {visible.length === 1 ? "product" : "products"}</p>
      </div>
    </div>}
    {!tools && props.showCount === true && <p className="mt-5 text-sm text-store-muted" role="status">{visible.length} {visible.length === 1 ? "product" : "products"}</p>}
    {!visible.length ? <div className="flex flex-col items-center rounded-media bg-store-surface px-6 py-16 text-center mt-8">
      <MagnifyingGlass size={32} weight="light" className="mb-5 text-store-muted" />
      <h2 className="font-heading text-2xl font-semibold">{filtered ? "No matches this time" : "Something good is on its way"}</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-store-muted">{filtered ? "Try a different word or clear your filters to see more of the collection." : active ? `There are no products in ${active} yet. Explore the rest of the store.` : "Our collection is being prepared. Check back soon."}</p>
      {filtered ? <button data-demo-control="true" type="button" onClick={clear} className="btn-secondary mt-6">Clear filters</button> : active && <Link href={`/${storeSlug}/products`} className="btn-secondary mt-6">Browse all products</Link>}
    </div> : <div className={`mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14 ${columns}`}>
      {visible.map(product => <ProductCard key={product.id} product={product} storeSlug={storeSlug} currency={currency} quickAdd={quickAdd} cardStyle={typeof props.cardStyle === "string" ? props.cardStyle : "minimal"} imageFit={typeof props.imageFit === "string" ? props.imageFit : "cover"} />)}
    </div>}
  </section>;
}
