import Link from "next/link";
import { formatMoney } from "@repo/core";
import type { Product } from "@/lib/types";
import AddToCartButton from "./AddToCartButton";

export default function ProductCard({ product, storeSlug, currency }: { product: Product; storeSlug: string; currency: string }) {
  const image = product.images[0];
  const href = `/${storeSlug}/product/${product.slug}`;
  const onSale = product.compareAtPriceCents !== null && product.compareAtPriceCents > product.priceCents;

  return (
    <article className="group flex flex-col">
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden rounded-lg bg-store-surface">
        {image && (
          <img
            src={image.url}
            alt={image.alt ?? product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
      </Link>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <Link href={href} className="text-sm font-medium text-store-fg hover:underline">
          {product.name}
        </Link>
        <p className="text-sm">
          <span className={onSale ? "text-store-accent font-medium" : "text-store-muted"}>{formatMoney(product.priceCents, currency)}</span>
          {onSale && <s className="ml-2 text-store-muted">{formatMoney(product.compareAtPriceCents!, currency)}</s>}
        </p>
        <AddToCartButton product={product} className="mt-auto pt-3 [&_.btn-primary]:py-2.5" />
      </div>
    </article>
  );
}
