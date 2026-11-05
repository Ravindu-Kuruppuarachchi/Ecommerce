"use client";

import { useState } from "react";
import { formatMoney } from "@repo/core";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

export default function AddToCartButton({ product, storeSlug, currency = "LKR", className = "" }: { product: Product; storeSlug: string; currency?: string; className?: string }) {
  const cart = useCart();
  const [variantId, setVariantId] = useState("");
  const hasVariants = product.variants.length > 0;
  const variant = product.variants.find(v => v.id === variantId);
  const stock = hasVariants ? variant?.quantity ?? 0 : product.quantity;
  const needsChoice = hasVariants && !variant;
  return <div className={className}>
    {hasVariants && <label className="mb-2 block text-xs">Choose an option
      <select aria-label={`Choose a variant for ${product.name}`} value={variantId} onChange={event => setVariantId(event.target.value)} className="mt-1 w-full rounded-control border border-store-line bg-store-bg p-2 text-store-fg">
        <option value="">Select…</option>
        {product.variants.map(v => <option key={v.id} value={v.id} disabled={v.quantity <= 0}>{v.title} — {formatMoney(v.priceCents ?? product.priceCents, currency)}{v.quantity <= 0 ? " (sold out)" : ""}</option>)}
      </select>
    </label>}
    {stock > 0 && stock < 10 && <p className="mb-2 text-xs font-semibold text-red-500" role="status">Only {stock} left</p>}
    <button type="button" disabled={needsChoice || stock <= 0} className="btn-primary w-full py-2.5" onClick={() => {
      if (needsChoice || stock <= 0) return;
      cart.add({ productId: product.id, variantId: variant?.id, variantTitle: variant?.title, name: product.name, slug: product.slug, priceCents: variant?.priceCents ?? product.priceCents, image: product.images[0]?.url, maxQuantity: stock });
    }}>{needsChoice ? "Choose an option" : stock <= 0 ? "Sold out" : "Add to cart"}</button>
  </div>;
}
