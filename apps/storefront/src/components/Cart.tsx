"use client";

import Link from "next/link";
import { formatMoney } from "@repo/core";
import type { CartItem } from "@/lib/cart";

interface CartProps {
  items: CartItem[];
  onRemove: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  storeSlug: string;
}

export default function Cart({
  items,
  onRemove,
  onUpdateQuantity,
  storeSlug,
}: CartProps) {
  // Tax and shipping are worked out at checkout from the store's settings.
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          🛒 Shopping Cart
          {items.length > 0 && (
            <span className="text-xs text-gray-400 font-normal">
              ({items.length} {items.length === 1 ? "item" : "items"})
            </span>
          )}
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-gray-500 text-sm">Your cart is empty</p>
          <p className="text-gray-400 text-xs mt-1">
            Add some products to get started
          </p>
        </div>
      ) : (
        <div>
          {/* Cart Items */}
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="px-5 py-4 flex gap-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatMoney(item.priceCents)} each
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity - 1)
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity + 1)
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm transition-colors"
                    >
                      +
                    </button>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="ml-auto text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="font-semibold text-gray-900 text-sm flex-shrink-0">
                  {formatMoney(item.priceCents * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="px-5 py-4 bg-gray-50/50">
            <div className="flex justify-between text-base font-bold">
              <span>Subtotal</span>
              <span style={{ color: "var(--store-accent)" }}>{formatMoney(subtotal)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Tax and delivery calculated at checkout</p>
          </div>

          {/* Checkout */}
          <div className="px-5 py-4">
            <Link href={`/${storeSlug}/checkout`} className="btn-checkout block text-center">
              Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
