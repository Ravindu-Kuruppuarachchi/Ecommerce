"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { applyBps, formatMoney } from "@repo/core";
import { API_URL } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { PublicStore } from "@/lib/types";

const FIELDS = [
  { name: "email", label: "Email", type: "email", autoComplete: "email", required: true },
  { name: "phone", label: "Mobile number", type: "tel", autoComplete: "tel", required: true, help: "The courier calls this number on delivery day." },
  { name: "name", label: "Full name", type: "text", autoComplete: "name", required: true },
  { name: "line1", label: "Address", type: "text", autoComplete: "address-line1", required: true },
  { name: "line2", label: "Apartment, floor, landmark (optional)", type: "text", autoComplete: "address-line2", required: false },
] as const;

type FormState = Record<"email" | "phone" | "name" | "line1" | "line2" | "city" | "district" | "postalCode", string>;

export default function CheckoutForm({ store }: { store: PublicStore }) {
  const cart = useCart();
  const [form, setForm] = useState<FormState>({ email: "", phone: "", name: "", line1: "", line2: "", city: "", district: "", postalCode: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<{ orderNumber: number; totalCents: number } | null>(null);

  const money = (cents: number) => formatMoney(cents, store.currency);
  // Display estimate only; the API prices the order from the database.
  const tax = applyBps(cart.subtotalCents, store.taxBps);
  const total = cart.subtotalCents + tax;
  const set = (name: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const optional = (v: string) => (v.trim() ? v.trim() : undefined);
      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug: store.slug,
          email: form.email,
          paymentMethod: "cod",
          items: cart.items.map((i) => ({ productId: i.id, quantity: i.quantity })),
          shippingAddress: {
            name: form.name,
            phone: form.phone,
            line1: form.line1,
            line2: optional(form.line2),
            city: form.city,
            district: optional(form.district),
            postalCode: optional(form.postalCode),
          },
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.details?.[0]?.message ?? body?.error ?? "We couldn't place your order");
      cart.clear();
      setPlaced({ orderNumber: body.orderNumber, totalCents: body.totalCents });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't place your order");
    } finally {
      setSubmitting(false);
    }
  };

  if (placed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CheckCircle size={48} className="mx-auto text-store-accent" />
        <h1 className="mt-4 font-heading text-3xl font-semibold">Order #{placed.orderNumber} placed</h1>
        <p className="mt-3 text-store-muted">
          Please have <strong className="text-store-fg">{money(placed.totalCents)}</strong> ready in cash when it arrives. Keep your order
          number in case you need to contact {store.name}.
        </p>
        <Link href={`/${store.slug}`} className="btn-secondary mt-8">Continue shopping</Link>
      </div>
    );
  }

  if (!cart.ready) return <div className="mx-auto h-96 max-w-5xl animate-pulse px-4 py-12 sm:px-8"><div className="h-full rounded-lg bg-store-surface" /></div>;

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-heading text-3xl font-semibold">Your cart is empty</h1>
        <Link href={`/${store.slug}/products`} className="btn-primary mt-8">Browse products</Link>
      </div>
    );
  }

  const closed = store.status !== "live";

  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 py-12 sm:px-8 lg:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Checkout</h1>
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={`co-${f.name}`} className="field-label">{f.label}</label>
            <input id={`co-${f.name}`} type={f.type} autoComplete={f.autoComplete} required={f.required} value={form[f.name]} onChange={set(f.name)} className="field" />
            {"help" in f && <p className="mt-1.5 text-xs text-store-muted">{f.help}</p>}
          </div>
        ))}
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="co-city" className="field-label">City</label>
            <input id="co-city" required autoComplete="address-level2" value={form.city} onChange={set("city")} className="field" />
          </div>
          <div>
            <label htmlFor="co-district" className="field-label">District</label>
            <input id="co-district" autoComplete="address-level1" value={form.district} onChange={set("district")} className="field" />
          </div>
          <div>
            <label htmlFor="co-postal" className="field-label">Postal code</label>
            <input id="co-postal" inputMode="numeric" autoComplete="postal-code" value={form.postalCode} onChange={set("postalCode")} className="field" />
          </div>
        </div>

        <fieldset className="rounded-lg border border-store-line p-4">
          <legend className="px-1 text-sm font-medium">Payment</legend>
          <p className="text-sm">Cash on delivery</p>
          <p className="mt-1 text-xs text-store-muted">Pay the courier when your order arrives.</p>
        </fieldset>

        {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {closed && <p className="text-sm text-store-muted">This store isn&apos;t taking orders yet.</p>}
        <button type="submit" disabled={submitting || closed} className="btn-primary">
          {submitting ? "Placing order…" : `Place order · ${money(total)}`}
        </button>
      </form>

      <aside className="h-fit rounded-lg bg-store-surface p-6 lg:sticky lg:top-24">
        <h2 className="mb-4 font-medium">Order summary</h2>
        <ul className="divide-y divide-store-line">
          {cart.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              {item.image ? <img src={item.image} alt="" className="h-14 w-12 rounded-md object-cover" /> : <span className="h-14 w-12 rounded-md bg-store-line" />}
              <span className="flex-1 text-sm">
                {item.name}
                <span className="block text-xs text-store-muted">Qty {item.quantity}</span>
              </span>
              <span className="text-sm">{money(item.priceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-store-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-store-muted">Subtotal</dt><dd>{money(cart.subtotalCents)}</dd></div>
          {store.taxBps > 0 && <div className="flex justify-between"><dt className="text-store-muted">Tax ({store.taxBps / 100}%)</dt><dd>{money(tax)}</dd></div>}
          <div className="flex justify-between"><dt className="text-store-muted">Delivery</dt><dd>Free</dd></div>
          <div className="flex justify-between border-t border-store-line pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(total)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
