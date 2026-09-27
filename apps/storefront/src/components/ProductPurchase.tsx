"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react/dist/ssr";
import { formatMoney } from "@repo/core";
import { useCart } from "@/lib/cart";
import { track } from "@/lib/track";
import type { Product, PublicStore } from "@/lib/types";

/** Price, option pickers, quantity and add-to-cart for the product page. */
export default function ProductPurchase({ product, store }: { product: Product; store: PublicStore }) {
  const cart = useCart();
  const hasVariants = product.variants.length > 0;
  // Start on the first variant that's in stock, so the page opens on something buyable.
  const initial = product.variants.find((v) => v.quantity > 0) ?? product.variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(initial?.optionValues ?? {});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    track(store.slug, "product_view", { productId: product.id });
  }, [product.id, store.slug]);

  const variant = useMemo(
    () => (hasVariants ? product.variants.find((v) => product.options.every((o) => v.optionValues[o.name] === selected[o.name])) ?? null : null),
    [hasVariants, product, selected],
  );
  const price = variant?.priceCents ?? product.priceCents;
  const stock = hasVariants ? variant?.quantity ?? 0 : product.quantity;
  const unavailable = hasVariants && !variant;
  const soldOut = !unavailable && stock <= 0;
  const onSale = product.compareAtPriceCents !== null && product.compareAtPriceCents > price;

  /** Whether choosing `value` for `option` (keeping other choices) leads to a variant in stock. */
  const inStock = (option: string, value: string) =>
    product.variants.some(
      (v) => v.quantity > 0 && product.options.every((o) => v.optionValues[o.name] === (o.name === option ? value : selected[o.name])),
    );

  const add = () =>
    cart.add(
      {
        productId: product.id,
        variantId: variant?.id,
        variantTitle: variant?.title,
        name: product.name,
        slug: product.slug,
        priceCents: price,
        image: product.images[0]?.url,
        maxQuantity: stock,
      },
      quantity,
    );

  return (
    <div>
      <p className="mt-4 text-xl">
        <span className={onSale ? "text-store-accent" : ""}>{formatMoney(price, store.currency)}</span>
        {onSale && <s className="ml-3 text-base text-store-muted">{formatMoney(product.compareAtPriceCents!, store.currency)}</s>}
      </p>

      {product.options.map((option) => (
        <fieldset key={option.name} className="mt-6">
          <legend className="mb-2 text-sm font-medium">
            {option.name}: <span className="font-normal text-store-muted">{selected[option.name]}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const active = selected[option.name] === value;
              const available = inStock(option.name, value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelected((s) => ({ ...s, [option.name]: value }));
                    setQuantity(1);
                  }}
                  className={`rounded-control border px-4 py-2 text-sm transition-colors ${
                    active ? "border-store-fg bg-store-fg text-store-bg" : "border-store-line hover:border-store-fg"
                  } ${available ? "" : "text-store-muted line-through decoration-1"}`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <p className="mt-6 text-sm text-store-muted" aria-live="polite">
        {unavailable ? "This combination isn't available" : soldOut ? "Out of stock" : stock < 10 ? `Only ${stock} left` : "In stock"}
      </p>

      <div className="mt-4 flex max-w-md gap-3">
        {!soldOut && !unavailable && (
          <div className="flex items-center rounded-control border border-store-line">
            <button type="button" aria-label="Fewer" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-3">
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{quantity}</span>
            <button type="button" aria-label="More" disabled={quantity >= stock} onClick={() => setQuantity((q) => Math.min(stock, q + 1))} className="px-3 py-3 disabled:opacity-40">
              <Plus size={14} />
            </button>
          </div>
        )}
        <button type="button" onClick={add} disabled={soldOut || unavailable} className="btn-primary flex-1">
          {unavailable ? "Unavailable" : soldOut ? "Sold out" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
