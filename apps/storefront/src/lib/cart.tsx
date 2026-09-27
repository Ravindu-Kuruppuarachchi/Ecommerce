"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  id: string;
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
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// Versioned so carts saved before prices moved to integer cents are ignored rather than misread.
const cartKey = (storeSlug: string) => `cart-v3-${storeSlug}`;

function readCart(storeSlug: string): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(cartKey(storeSlug)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((i) => typeof i?.id === "string" && Number.isInteger(i?.priceCents)) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ storeSlug, children }: { storeSlug: string; children: ReactNode }) {
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

  const add = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, ...item, quantity: Math.min(i.quantity + quantity, item.maxQuantity) } : i));
      }
      return [...prev, { ...item, quantity: Math.min(quantity, item.maxQuantity) }];
    });
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(quantity, i.maxQuantity) } : i)),
    );
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotalCents: items.reduce((n, i) => n + i.priceCents * i.quantity, 0),
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add,
      setQuantity,
      remove: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
      clear: () => setItems([]),
    }),
    [items, ready, isOpen, add, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
