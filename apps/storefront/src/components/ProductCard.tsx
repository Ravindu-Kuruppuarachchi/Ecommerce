import Link from "next/link";
import { Package } from "@phosphor-icons/react/dist/ssr";
import { formatMoney, productSummary } from "@repo/core";
import type { Product } from "@/lib/types";
import AddToCartButton from "./AddToCartButton";

interface Props {
  product: Product;
  storeSlug: string;
  currency: string;
  /** Theme setting: show an add-to-cart button on the card. */
  quickAdd: boolean;
  cardStyle?: string;
  imageFit?: string;
}

export default function ProductCard({ product, storeSlug, currency, quickAdd, cardStyle = "minimal", imageFit = "cover" }: Props) {
  const image = product.images[0];
  const href = `/${storeSlug}/product/${product.slug}`;
  const { price: from, varies, onSale, available } = productSummary(product);
  const alternate = product.images[1];

  return (
    <article className={`product-card group flex min-w-0 flex-col ${cardStyle === "framed" ? "product-card-framed" : ""}`}>
      <Link href={href} className="product-image relative block aspect-product overflow-hidden rounded-media bg-store-surface">
        {image ? (
          <img
            src={image.url}
            alt={image.alt ?? product.name}
            loading="lazy"
            className={`h-full w-full transition-transform duration-500 motion-safe:group-hover:scale-[1.04] ${imageFit === "contain" ? "object-contain p-6" : "object-cover"}`}
          />
        ) : <div className="flex h-full min-h-40 items-center justify-center text-store-muted"><Package size={40} weight="thin" aria-label="No product image" /></div>}
        {alternate && <img src={alternate.url} alt="" aria-hidden="true" loading="lazy" className={`product-alternate absolute inset-0 h-full w-full opacity-0 ${imageFit === "contain" ? "object-contain p-6 bg-store-surface" : "object-cover"}`} />}
        {onSale && <span className="absolute left-3 top-3 bg-store-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-store-fg">Sale</span>}
        {!available && <span className="absolute bottom-3 left-3 bg-store-bg px-2.5 py-1 text-xs text-store-fg">Sold out</span>}
      </Link>
      <div className="product-details mt-4 flex flex-1 flex-col gap-1.5">
        {product.category && <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-store-muted">{product.category}</p>}
        <Link href={href} className="text-sm font-medium text-store-fg hover:underline">
          {product.name}
        </Link>
        <p className="text-sm">
          <span className={onSale ? "text-store-accent font-medium" : "text-store-fg font-medium"}>
            {varies && "From "}
            {formatMoney(from, currency)}
          </span>
          {onSale && <s className="ml-2 text-store-muted">{formatMoney(product.compareAtPriceCents!, currency)}</s>}
        </p>
        {<AddToCartButton product={product} storeSlug={storeSlug} currency={currency} className="mt-auto pt-3" />}
      </div>
    </article>
  );
}
