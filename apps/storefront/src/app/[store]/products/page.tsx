import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { getProducts, getStore } from "@/lib/api";

export const metadata: Metadata = { title: "Shop" };

export default async function Catalog({ params, searchParams }: { params: { store: string }; searchParams: { category?: string } }) {
  const active = typeof searchParams.category === "string" ? searchParams.category : undefined;
  const [store, all] = await Promise.all([getStore(params.store), getProducts(params.store)]);
  if (!store) notFound();

  const categories = [...new Set(all.map((p) => p.category).filter((c): c is string => Boolean(c)))].sort();
  const products = active ? all.filter((p) => p.category === active) : all;
  const pill = (selected: boolean) =>
    `rounded-md border px-4 py-2 text-sm transition-colors ${selected ? "border-store-fg bg-store-fg text-store-bg" : "border-store-line text-store-muted hover:text-store-fg"}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
      <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">{active ?? "All products"}</h1>

      {categories.length > 1 && (
        <nav aria-label="Categories" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link href={`/${store.slug}/products`} className={pill(!active)} aria-current={!active ? "page" : undefined}>
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/${store.slug}/products?category=${encodeURIComponent(c)}`}
              className={`shrink-0 ${pill(active === c)}`}
              aria-current={active === c ? "page" : undefined}
            >
              {c}
            </Link>
          ))}
        </nav>
      )}

      {products.length === 0 ? (
        <p className="mt-16 text-store-muted">
          {active ? `Nothing in ${active} right now.` : "No products yet. Check back soon."}
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} storeSlug={store.slug} currency={store.currency} />
          ))}
        </div>
      )}
    </div>
  );
}
