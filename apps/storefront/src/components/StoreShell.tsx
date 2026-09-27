"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart";
import type { PublicStore } from "@/lib/types";
import CartDrawer from "./CartDrawer";
import StoreHeader from "./StoreHeader";

/** Client-side chrome shared by every store page: cart state, header and cart drawer. */
export default function StoreShell({ store, children }: { store: PublicStore; children: ReactNode }) {
  return (
    <CartProvider storeSlug={store.slug}>
      {store.status !== "live" && (
        <p className="bg-store-fg px-4 py-2 text-center text-xs text-store-bg">
          This store isn&apos;t open yet. You can look around, but checkout is turned off.
        </p>
      )}
      <StoreHeader store={store} />
      {children}
      <CartDrawer store={store} />
    </CartProvider>
  );
}
