"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "@phosphor-icons/react/dist/ssr";
import { formatMoney } from "@repo/core";
import { useCart } from "@/lib/cart";
import type { PublicStore } from "@/lib/types";

export default function CartDrawer({ store }: { store: PublicStore }) {
  const cart = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const money = (cents: number) => formatMoney(cents, store.currency);

  useEffect(() => {
    if (!cart.isOpen) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cart.close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cart.isOpen, cart.close]);

  if (!cart.isOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Close cart" onClick={cart.close} className="absolute inset-0 bg-black/40" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-store-bg text-store-fg shadow-xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-store-line px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">Your cart</h2>
          <button type="button" onClick={cart.close} aria-label="Close cart" className="rounded-control p-2 hover:bg-store-surface">
            <X size={20} />
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBag size={40} className="text-store-muted" />
            <p className="text-store-muted">Your cart is empty.</p>
            <Link href={`/${store.slug}/products`} onClick={cart.close} className="btn-secondary">
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-store-line overflow-y-auto px-5">
              {cart.items.map((item) => (
                <li key={item.key} className="flex gap-4 py-4">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-20 w-16 rounded-media object-cover" />
                  ) : (
                    <span className="h-20 w-16 rounded-media bg-store-surface" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <Link href={`/${store.slug}/product/${item.slug}`} onClick={cart.close} className="truncate text-sm font-medium hover:underline">
                        {item.name}
                      </Link>
                      <span className="text-sm">{money(item.priceCents * item.quantity)}</span>
                    </div>
                    <span className="text-xs text-store-muted">
                      {item.variantTitle && <>{item.variantTitle} · </>}
                      {money(item.priceCents)} each
                    </span>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-control border border-store-line">
                        <button
                          type="button"
                          aria-label={`One fewer ${item.name}`}
                          onClick={() => cart.setQuantity(item.key, item.quantity - 1)}
                          className="p-2 hover:bg-store-surface"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`One more ${item.name}`}
                          disabled={item.quantity >= item.maxQuantity}
                          onClick={() => cart.setQuantity(item.key, item.quantity + 1)}
                          className="p-2 hover:bg-store-surface disabled:opacity-40"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button type="button" onClick={() => cart.remove(item.key)} className="text-xs text-store-muted underline-offset-2 hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-store-line px-5 py-5">
              <div className="mb-1 flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{money(cart.subtotalCents)}</span>
              </div>
              <p className="mb-4 text-xs text-store-muted">Tax and delivery are calculated at checkout.</p>
              <Link href={`/${store.slug}/checkout`} onClick={cart.close} className="btn-primary w-full">
                Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
