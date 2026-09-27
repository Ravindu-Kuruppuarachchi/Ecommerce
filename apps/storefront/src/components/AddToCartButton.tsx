"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

/** Quick add from a product card. Products with options send people to choose one first. */
export default function AddToCartButton({ product, storeSlug, className = "" }: { product: Product; storeSlug: string; className?: string }) {
  const cart = useCart();

  if (product.variants.length > 0) {
    return (
      <div className={className}>
        <Link href={`/${storeSlug}/product/${product.slug}`} className="btn-secondary w-full py-2.5">
          Choose options
        </Link>
      </div>
    );
  }

  const soldOut = product.quantity <= 0;
  return (
    <div className={className}>
      <button
        type="button"
        disabled={soldOut}
        onClick={() =>
          cart.add({
            productId: product.id,
            name: product.name,
            slug: product.slug,
            priceCents: product.priceCents,
            image: product.images[0]?.url,
            maxQuantity: product.quantity,
          })
        }
        className="btn-primary w-full py-2.5"
      >
        {soldOut ? "Sold out" : "Add to cart"}
      </button>
    </div>
  );
}
