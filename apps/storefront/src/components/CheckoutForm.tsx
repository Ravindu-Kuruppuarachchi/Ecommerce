"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle, Tag, X } from "@phosphor-icons/react/dist/ssr";
import { applyBps, formatMoney, SRI_LANKA_DISTRICTS } from "@repo/core";
import { API_URL } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useCustomer, customerRequest } from "@/lib/customer";
import CustomerSignIn from "./CustomerSignIn";
import { track } from "@/lib/track";
import type { PublicStore } from "@/lib/types";

type FormState = Record<"email" | "phone" | "name" | "line1" | "line2" | "city" | "district" | "postalCode", string>;

interface Quote {
  zone: { name: string; estimatedDays: string | null; freeOverCents: number | null } | null;
  shippingCents: number;
  shippingBeforeDiscountCents: number;
  discount: { title: string; code: string | null; type: string } | null;
  discountCents: number;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.details?.[0]?.message ?? data?.error ?? "Something went wrong");
  return data;
}

export default function CheckoutForm({ store }: { store: PublicStore }) {
  const cart = useCart();
  const account = useCustomer();
  const [form, setForm] = useState<FormState>({ email: "", phone: "", name: "", line1: "", line2: "", city: "", district: "", postalCode: "" });
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<{ orderNumber: number; totalCents: number } | null>(null);

  useEffect(() => {
    if (!account.customer) return;
    const customer = account.customer;
    setForm(current => ({ ...current, ...customer.savedAddress, email: customer.email,
      name: customer.savedAddress?.name || [customer.firstName, customer.lastName].filter(Boolean).join(" "),
      phone: customer.savedAddress?.phone || customer.phone || "" }));
  }, [account.customer]);

  const { shipping: shippingOn, discounts: discountsOn } = store.features;
  const money = (cents: number) => formatMoney(cents, store.currency);
  const set = (name: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [name]: e.target.value }));

  useEffect(() => {
    if (cart.ready && cart.items.length) track(store.slug, "checkout_start");
    // Once per visit to checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready]);

  // Ask the server for delivery and discounts whenever something that affects them changes.
  const needsDistrict = shippingOn && !form.district;
  useEffect(() => {
    if (!cart.ready || !cart.items.length || needsDistrict || (!shippingOn && !discountsOn)) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    post<Quote>(`${API_URL}/stores/${store.slug}/quote`, {
      subtotalCents: cart.subtotalCents,
      district: form.district || undefined,
      code: code ?? undefined,
    })
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
        setQuoteError("");
        // A valid code that saves nothing on this order (e.g. free delivery when delivery is already free).
        if (code && q.discount?.code !== code) setCodeError("This code doesn't lower your total on this order.");
      })
      .catch((err) => {
        if (cancelled) return;
        if (code) {
          // Keep the order usable: drop the code and show why.
          setCodeError(err.message);
          setCode(null);
        } else {
          setQuote(null);
          setQuoteError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cart.ready, cart.items.length, cart.subtotalCents, form.district, code, needsDistrict, shippingOn, discountsOn, store.slug]);

  const discountCents = quote?.discountCents ?? 0;
  const shippingCents = quote?.shippingCents ?? 0;
  const goods = cart.subtotalCents - discountCents;
  const tax = applyBps(goods, store.taxBps);
  const total = goods + tax + shippingCents;
  const ready = !needsDistrict && !quoteError;

  const applyCode = (e: FormEvent) => {
    e.preventDefault();
    setCodeError("");
    const value = codeInput.trim().toUpperCase();
    if (value) setCode(value);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!account.customer || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const optional = (v: string) => (v.trim() ? v.trim() : undefined);
      const order = await customerRequest<{ orderNumber: number; totalCents: number }>(store.slug, "checkout", { method: "POST", body: JSON.stringify({
        storeSlug: store.slug,
        paymentMethod: "cod",
        discountCode: code ?? undefined,
        items: cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        shippingAddress: {
          name: form.name,
          phone: form.phone,
          line1: form.line1,
          line2: optional(form.line2),
          city: form.city,
          district: optional(form.district),
          postalCode: optional(form.postalCode),
        },
      }) });
      cart.clear();
      setPlaced(order);
    } catch (err) {
      if ((err as { status?: number }).status === 401) await account.refresh();
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
          Please have <strong className="text-store-fg">{money(placed.totalCents)}</strong> ready in cash when it arrives
          {quote?.zone?.estimatedDays ? ` (usually ${quote.zone.estimatedDays})` : ""}. Keep your order number in case you need to contact {store.name}.
        </p>
        <Link href={`/${store.slug}`} className="btn-secondary mt-8">Continue shopping</Link>
      </div>
    );
  }

  if (!cart.ready) return <div className="mx-auto h-96 max-w-5xl animate-pulse px-4 py-12 sm:px-8"><div className="h-full rounded-media bg-store-surface" /></div>;

  if (account.loading) return <p role="status" className="px-4 py-16 text-center text-store-muted">Loading your account…</p>;
  if (account.error) return <div className="px-4 py-16 text-center"><p role="alert">{account.error}</p><button type="button" className="btn-secondary mt-4" onClick={() => void account.refresh()}>Try again</button></div>;
  if (!account.customer) return <CustomerSignIn storeSlug={store.slug} checkout />;

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-heading text-3xl font-semibold">Your cart is empty</h1>
        <Link href={`/${store.slug}/products`} className="btn-primary mt-8">Browse products</Link>
      </div>
    );
  }

  const closed = store.status !== "live";
  const field = (name: keyof FormState, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, help?: string) => (
    <div>
      <label htmlFor={`co-${name}`} className="field-label">{label}</label>
      <input id={`co-${name}`} value={form[name]} onChange={set(name)} className="field" {...props} />
      {help && <p className="mt-1.5 text-xs text-store-muted">{help}</p>}
    </div>
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 py-12 sm:px-8 lg:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-sm text-store-muted">Signed in as <strong className="text-store-fg">{account.customer.email}</strong> · <Link href={`/${store.slug}/account`} className="underline">My account</Link></p>
        {field("phone", "Mobile number", { type: "tel", autoComplete: "tel", required: true }, "The courier calls this number on delivery day.")}
        {field("name", "Full name", { autoComplete: "name", required: true })}
        {field("line1", "Address", { autoComplete: "address-line1", required: true })}
        {field("line2", "Apartment, floor, landmark (optional)", { autoComplete: "address-line2" })}
        <div className="grid gap-5 sm:grid-cols-3">
          {field("city", "City", { autoComplete: "address-level2", required: true })}
          <div>
            <label htmlFor="co-district" className="field-label">District</label>
            <select id="co-district" value={form.district} onChange={set("district")} required={shippingOn} autoComplete="address-level1" className="field">
              <option value="">Choose…</option>
              {SRI_LANKA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {field("postalCode", "Postal code", { inputMode: "numeric", autoComplete: "postal-code" })}
        </div>
        {quoteError && <p role="alert" className="text-sm text-red-700">{quoteError}</p>}

        <fieldset className="rounded-media border border-store-line p-4">
          <legend className="px-1 text-sm font-medium">Payment</legend>
          <p className="text-sm">Cash on delivery</p>
          <p className="mt-1 text-xs text-store-muted">Pay the courier when your order arrives.</p>
        </fieldset>

        {error && <p role="alert" className="rounded-control border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {closed && <p className="text-sm text-store-muted">This store isn&apos;t taking orders yet.</p>}
        <button type="submit" disabled={submitting || closed || !ready} className="btn-primary">
          {submitting ? "Placing order…" : needsDistrict ? "Choose your district" : `Place order · ${money(total)}`}
        </button>
      </form>

      <aside className="h-fit rounded-media bg-store-surface p-6 lg:sticky lg:top-24">
        <h2 className="mb-4 font-medium">Order summary</h2>
        <ul className="divide-y divide-store-line">
          {cart.items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 py-3">
              {item.image ? <img src={item.image} alt="" className="h-14 w-12 rounded-control object-cover" /> : <span className="h-14 w-12 rounded-control bg-store-line" />}
              <span className="flex-1 text-sm">
                {item.name}
                <span className="block text-xs text-store-muted">
                  {item.variantTitle && <>{item.variantTitle} · </>}Qty {item.quantity}
                </span>
              </span>
              <span className="text-sm">{money(item.priceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>

        {discountsOn && (
          <div className="mt-4 border-t border-store-line pt-4">
            {code && quote?.discount?.code === code ? (
              <p className="flex items-center justify-between rounded-control border border-store-line px-3 py-2 text-sm">
                <span className="flex items-center gap-2"><Tag size={16} /> {code}</span>
                <button type="button" onClick={() => { setCode(null); setCodeInput(""); setCodeError(""); }} aria-label="Remove code" className="p-1">
                  <X size={14} />
                </button>
              </p>
            ) : (
              <form onSubmit={applyCode} className="flex gap-2">
                <label htmlFor="co-code" className="sr-only">Discount code</label>
                <input id="co-code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Discount code" className="field uppercase" />
                <button type="submit" className="btn-secondary px-4">Apply</button>
              </form>
            )}
            {codeError && <p className="mt-2 text-xs text-red-700" role="alert">{codeError}</p>}
          </div>
        )}

        <dl className="mt-4 space-y-2 border-t border-store-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-store-muted">Subtotal</dt><dd>{money(cart.subtotalCents)}</dd></div>
          {discountCents > 0 && (
            <div className="flex justify-between text-store-accent"><dt>{quote?.discount?.title}</dt><dd>−{money(discountCents)}</dd></div>
          )}
          {store.taxBps > 0 && <div className="flex justify-between"><dt className="text-store-muted">Tax ({store.taxBps / 100}%)</dt><dd>{money(tax)}</dd></div>}
          <div className="flex justify-between">
            <dt className="text-store-muted">
              Delivery
              {quote?.zone?.estimatedDays && <span className="block text-xs">{quote.zone.estimatedDays}</span>}
            </dt>
            <dd>
              {!shippingOn ? "Free" : needsDistrict ? "Choose district" : !quote ? "…" : shippingCents === 0 ? (
                <>
                  {quote.shippingBeforeDiscountCents > 0 && <s className="mr-1.5 text-store-muted">{money(quote.shippingBeforeDiscountCents)}</s>}
                  Free
                </>
              ) : money(shippingCents)}
            </dd>
          </div>
          {quote?.zone?.freeOverCents && shippingCents > 0 && goods < quote.zone.freeOverCents && (
            <p className="text-xs text-store-muted">Free delivery to {form.district} on orders over {money(quote.zone.freeOverCents)}.</p>
          )}
          <div className="flex justify-between border-t border-store-line pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(total)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
