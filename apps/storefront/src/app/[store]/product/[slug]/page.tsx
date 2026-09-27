import { themeSettings } from "@/lib/theme";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductPurchase from "@/components/ProductPurchase";
import ProductCard from "@/components/ProductCard";
import { getProduct, getStore } from "@/lib/api";

type Params = { params: { store: string; slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getProduct(params.store, params.slug);
  if (!data) return {};
  const { product } = data;
  return {
    title: product.name,
    description: product.description?.slice(0, 160) ?? undefined,
    openGraph: product.images[0] ? { images: [product.images[0].url] } : undefined,
  };
}

export default async function ProductPage({ params }: Params) {
  const [store, data] = await Promise.all([getStore(params.store), getProduct(params.store, params.slug)]);
  if (!store || !data) notFound();
  const { product, relatedProducts } = data;
  const [main, ...rest] = product.images;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-store-muted">
        <Link href={`/${store.slug}/products`} className="hover:text-store-fg">Shop</Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/${store.slug}/products?category=${encodeURIComponent(product.category)}`} className="hover:text-store-fg">
              {product.category}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-4">
          <div className="aspect-product overflow-hidden rounded-media bg-store-surface">
            {main && <img src={main.url} alt={main.alt ?? product.name} className="h-full w-full object-cover" />}
          </div>
          {rest.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {rest.map((img) => (
                <img key={img.url} src={img.url} alt={img.alt ?? ""} loading="lazy" className="aspect-square rounded-media object-cover" />
              ))}
            </div>
          )}
        </div>

        <div className="md:pt-4">
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">{product.name}</h1>
          <ProductPurchase product={product} store={store} />
          {product.description && (
            <div className="mt-10 max-w-[60ch] space-y-4 leading-relaxed text-store-muted">
              {product.description.split(/\n\s*\n/).map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 font-heading text-2xl font-semibold tracking-tight">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} storeSlug={store.slug} currency={store.currency} quickAdd={themeSettings(store.theme).quickAdd} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
