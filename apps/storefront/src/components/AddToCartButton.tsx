"use client";

import { useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  /** Show a quantity stepper next to the button (product page). */
  withQuantity?: boolean;
  className?: string;
}

export default function AddToCartButton({ product, withQuantity = false, className = "" }: Props) {
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const soldOut = product.quantity <= 0;

  const add = () =>
    cart.add(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        priceCents: product.priceCents,
        image: product.images[0]?.url,
        maxQuantity: product.quantity,
      },
      quantity,
    );

  return (
    <div className={`flex gap-3 ${className}`}>
      {withQuantity && !soldOut && (
        <div className="flex items-center rounded-md border border-store-line">
          <button type="button" aria-label="Fewer" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-3 hover:bg-store-surface">
            <Minus size={14} />
          </button>
          <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{quantity}</span>
          <button
            type="button"
            aria-label="More"
            disabled={quantity >= product.quantity}
            onClick={() => setQuantity((q) => Math.min(product.quantity, q + 1))}
            className="px-3 py-3 hover:bg-store-surface disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </div>
      )}
      <button type="button" onClick={add} disabled={soldOut} className="btn-primary flex-1">
        {soldOut ? "Sold out" : "Add to cart"}
      </button>
    </div>
  );
}
