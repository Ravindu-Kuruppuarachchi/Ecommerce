"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CartProvider } from "@/lib/cart";
import { CustomerProvider } from "@/lib/customer";
import { track } from "@/lib/track";
import type { PublicStore } from "@/lib/types";
import CartDrawer from "./CartDrawer";
import StoreHeader from "./StoreHeader";

/** Client-side chrome shared by every store page: cart state, header, cart drawer and visit tracking. */
export default function StoreShell({ store, children }: { store: PublicStore; children: ReactNode }) {
  const pathname = usePathname();
  // Visits are recorded for every store (the platform reports traffic across all of them);
  // merchants see their own numbers when they turn on Analytics.
  useEffect(() => {
    track(store.slug, "page_view");
  }, [pathname, store.slug]);

  const onAdd = useCallback((productId: string) => track(store.slug, "add_to_cart", { productId }), [store.slug]);

  return (
    <CustomerProvider key={store.slug} storeSlug={store.slug}>
    <CartProvider storeSlug={store.slug} onAdd={onAdd}>
      {store.status !== "live" && (
        <p className="bg-store-fg px-4 py-2 text-center text-xs text-store-bg">
          This store isn&apos;t open yet. You can look around, but checkout is turned off.
        </p>
      )}
      <StoreHeader store={store} />
      {children}
      <CartDrawer store={store} />
    </CartProvider>
    </CustomerProvider>
  );
}
