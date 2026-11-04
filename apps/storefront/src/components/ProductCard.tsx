import Link from "next/link";
import { formatMoney } from "@repo/core";
import type { Product } from "@/lib/types";
import AddToCartButton from "./AddToCartButton";

interface Props {
  product: Product;
  storeSlug: string;
  currency: string;
  /** Theme setting: show an add-to-cart button on the card. */
  quickAdd: boolean;
}

export default function ProductCard({ product, storeSlug, currency, quickAdd }: Props) {
  const image = product.images[0];
  const href = `/${storeSlug}/product/${product.slug}`;
  // Variant prices can differ; show the lowest as "From".
  const prices = product.variants.length ? product.variants.map((v) => v.priceCents ?? product.priceCents) : [product.priceCents];
  const from = Math.min(...prices);
  const varies = new Set(prices).size > 1;
  const onSale = !varies && product.compareAtPriceCents !== null && product.compareAtPriceCents > from;

  return (
    <article className="group flex flex-col">
      <Link href={href} className="relative block aspect-product overflow-hidden rounded-media bg-store-surface">
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
          <span className={onSale ? "text-store-accent font-medium" : "text-store-muted"}>
            {varies && "From "}
            {formatMoney(from, currency)}
          </span>
          {onSale && <s className="ml-2 text-store-muted">{formatMoney(product.compareAtPriceCents!, currency)}</s>}
        </p>
        {quickAdd && <AddToCartButton product={product} storeSlug={storeSlug} className="mt-auto pt-3" />}
      </div>
    </article>
  );
}
