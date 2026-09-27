"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { applyBps, formatMoney } from "@repo/core";
import { cartKey, type CartItem } from "@/lib/cart";

interface StoreTheme {
  primaryColor: string; secondaryColor: string;
  accentColor: string; fontFamily: string;
}
interface Store {
  id: string; name: string; slug: string; currency: string; taxBps: number; theme?: StoreTheme;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const storeSlug = params.store as string;

  const [store, setStore] = useState<Store | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderComplete, setOrderComplete] = useState<{ orderNumber: number; totalCents: number } | null>(null);
  const [step, setStep] = useState<"info" | "confirm">("info");

  const [form, setForm] = useState({
    email: "", name: "", phone: "",
    line1: "", line2: "", city: "", district: "", postalCode: "",
  });

  useEffect(() => {
    // Load cart from localStorage
    const cart = JSON.parse(localStorage.getItem(cartKey(storeSlug)) || "[]");
    setCartItems(cart);
    // Load store
    fetch(`${API_URL}/stores/${storeSlug}`).then(r => r.json()).then(setStore).catch(() => {});
  }, [storeSlug]);

  useEffect(() => {
    if (!store?.theme) return;
    const root = document.documentElement;
    root.style.setProperty("--store-primary", store.theme.primaryColor);
    root.style.setProperty("--store-secondary", store.theme.secondaryColor);
    root.style.setProperty("--store-accent", store.theme.accentColor);
  }, [store?.theme]);

  // An estimate for display; the API recalculates everything from current prices.
  const currency = store?.currency ?? "LKR";
  const subtotal = cartItems.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const taxBps = store?.taxBps ?? 0;
  const tax = applyBps(subtotal, taxBps);
  const total = subtotal + tax;
  const money = (cents: number) => formatMoney(cents, currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "info") { setStep("confirm"); return; }

    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug, email: form.email, paymentMethod: "cod",
          items: cartItems.map((i) => ({ productId: i.id, quantity: i.quantity })),
          shippingAddress: {
            name: form.name, phone: form.phone, line1: form.line1, city: form.city,
            ...(form.line2 && { line2: form.line2 }),
            ...(form.district && { district: form.district }),
            ...(form.postalCode && { postalCode: form.postalCode }),
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Order failed");
      const order = await res.json();
      localStorage.removeItem(cartKey(storeSlug));
      setOrderComplete({ orderNumber: order.orderNumber, totalCents: order.totalCents });
    } catch (err: any) {
      setError(err.message || "Checkout failed");
      setStep("info");
    } finally { setIsSubmitting(false); }
  };

  // Order confirmation
  if (orderComplete) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-500 mb-4">Thank you for your purchase</p>
        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs text-gray-400">Order number</p>
          <p className="font-mono font-semibold text-gray-700">#{orderComplete.orderNumber}</p>
        </div>
        <p className="text-sm text-gray-500 mb-6">Please have <strong>{money(orderComplete.totalCents)}</strong> ready in cash when your order is delivered.</p>
        <button onClick={() => router.push(`/${storeSlug}`)} className="btn-cart">Continue Shopping</button>
      </div>
    </div>
  );

  if (cartItems.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <button onClick={() => router.push(`/${storeSlug}`)} className="btn-cart mt-4 max-w-xs mx-auto">Browse Products</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="store-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
          <button onClick={() => router.push(`/${storeSlug}`)} className="text-lg font-bold tracking-tight">{store?.name || "Store"}</button>
          <span className="text-sm opacity-70">Secure Checkout 🔒</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {["Details", "Review"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${(i === 0 && step === "info") || (i === 1 && step === "confirm") ? "bg-gray-900 text-white" : i === 0 && step === "confirm" ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                {i === 0 && step === "confirm" ? "✓" : i + 1}
              </div>
              <span className={`text-sm font-medium ${(i === 0 && step === "info") || (i === 1 && step === "confirm") ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
              {i === 0 && <div className="w-12 h-0.5 bg-gray-200 mx-2"></div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit}>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}

              {step === "info" ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                  <div className="p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Contact</h2>
                    <input type="email" required placeholder="Email address" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field" />
                    <input type="tel" required placeholder="Mobile number (for the courier)" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="input-field" />
                  </div>
                  <div className="p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Shipping Address</h2>
                    <input type="text" required placeholder="Full name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="input-field" />
                    <input type="text" required placeholder="Address line 1" value={form.line1} onChange={(e) => setForm({...form, line1: e.target.value})} className="input-field" />
                    <input type="text" placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm({...form, line2: e.target.value})} className="input-field" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="text" required placeholder="City" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} className="input-field" />
                      <input type="text" placeholder="District" value={form.district} onChange={(e) => setForm({...form, district: e.target.value})} className="input-field" />
                      <input type="text" inputMode="numeric" placeholder="Postal code" value={form.postalCode} onChange={(e) => setForm({...form, postalCode: e.target.value})} className="input-field" />
                    </div>
                  </div>
                  <div className="p-6">
                    <button type="submit" className="btn-checkout">Review order</button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Review Order</h2>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                    <p><span className="text-gray-500">Email:</span> {form.email}</p>
                    <p><span className="text-gray-500">Deliver to:</span> {form.name}, {[form.line1, form.line2, form.city, form.district, form.postalCode].filter(Boolean).join(", ")}</p>
                    <p><span className="text-gray-500">Payment:</span> Cash on delivery</p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep("info")} className="btn-secondary flex-1">← Edit Info</button>
                    <button type="submit" disabled={isSubmitting} className="btn-checkout flex-1">
                      {isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Processing…</span> : `Place order · ${money(total)}`}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center">You pay the courier in cash when the order arrives.</p>
                </div>
              )}
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-8">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 py-3">
                    {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{money(item.priceCents * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{money(subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Tax ({taxBps / 100}%)</span><span>{money(tax)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Shipping</span><span className="text-emerald-600 font-medium">Free</span></div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span style={{ color: "var(--store-accent)" }}>{money(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
