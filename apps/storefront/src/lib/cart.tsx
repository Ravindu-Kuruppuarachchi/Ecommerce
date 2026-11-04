"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  /** Unique per product and variant. */
  key: string;
  productId: string;
  variantId?: string;
  variantTitle?: string;
  name: string;
  slug: string;
  priceCents: number;
  quantity: number;
  image?: string;
  /** Stock when added; caps the quantity controls. The API re-checks at checkout. */
  maxQuantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  /** False until the saved cart has been read, so the UI doesn't flash "empty". */
  ready: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: Omit<CartItem, "quantity" | "key">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// Versioned so carts saved before prices moved to integer cents are ignored rather than misread.
const cartKey = (storeSlug: string) => `cart-v4-${storeSlug}`;

export const itemKey = (productId: string, variantId?: string) => `${productId}:${variantId ?? ""}`;

function readCart(storeSlug: string): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(cartKey(storeSlug)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((i) =>
      typeof i?.productId === "string" && typeof i?.name === "string" && typeof i?.slug === "string" &&
      (i.variantId === undefined || typeof i.variantId === "string") && i.key === itemKey(i.productId, i.variantId) &&
      Number.isSafeInteger(i.priceCents) && i.priceCents >= 0 && i.priceCents <= 2_147_483_647 &&
      Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 100 &&
      Number.isInteger(i.maxQuantity) && i.maxQuantity >= i.quantity
    ).slice(0, 50) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ storeSlug, onAdd, children }: { storeSlug: string; onAdd?: (productId: string) => void; children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(readCart(storeSlug));
    setReady(true);
  }, [storeSlug]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(cartKey(storeSlug), JSON.stringify(items));
    } catch {
      // Private browsing or full storage: the cart still works for this visit.
    }
  }, [items, ready, storeSlug]);

  const add = useCallback(
    (item: Omit<CartItem, "quantity" | "key">, quantity = 1) => {
      if (!Number.isInteger(quantity) || quantity < 1 || item.maxQuantity < 1) return;
      const key = itemKey(item.productId, item.variantId);
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) => (i.key === key ? { ...i, ...item, quantity: Math.min(i.quantity + quantity, item.maxQuantity, 100) } : i));
        }
        if (prev.length >= 50) return prev;
        return [...prev, { ...item, key, quantity: Math.min(quantity, item.maxQuantity, 100) }];
      });
      setIsOpen(true);
      onAdd?.(item.productId);
    },
    [onAdd],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    if (!Number.isInteger(quantity)) return;
    setItems((prev) =>
      quantity <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(quantity, i.maxQuantity, 100) } : i)),
    );
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotalCents: items.reduce((n, i) => n + i.priceCents * i.quantity, 0),
      isOpen,
      open,
      close,
      add,
      setQuantity,
      remove: (key) => setItems((prev) => prev.filter((i) => i.key !== key)),
      clear: () => setItems([]),
    }),
    [items, ready, isOpen, add, setQuantity, open, close],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
