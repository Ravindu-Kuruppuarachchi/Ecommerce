"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { formatMoney, SRI_LANKA_DISTRICTS, type CustomerProfile } from "@repo/core";
import { customerRequest, useCustomer } from "@/lib/customer";
import type { PublicStore } from "@/lib/types";
import CustomerSignIn from "./CustomerSignIn";

interface CustomerOrder {
  id: string; orderNumber: number; status: string; paymentStatus: string; fulfillmentStatus: string;
  totalCents: number; currency: string; createdAt: string;
  items: Array<{ productName: string; variantTitle: string | null; quantity: number }>;
}

function AccountDetails({ customer, store }: { customer: CustomerProfile; store: PublicStore }) {
  const account = useCustomer();
  const [form, setForm] = useState({ firstName: customer.firstName || "", lastName: customer.lastName || "", phone: customer.phone || "" });
  const [saveAddress, setSaveAddress] = useState(Boolean(customer.savedAddress));
  const [address, setAddress] = useState(customer.savedAddress || { name: [customer.firstName, customer.lastName].filter(Boolean).join(" "), phone: customer.phone || "", line1: "", line2: "", city: "", district: "", postalCode: "" });
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error?: boolean; text: string } | null>(null);
  const [reloadOrders, setReloadOrders] = useState(0);

  useEffect(() => {
    let active = true;
    setOrdersLoading(true);
    setOrdersError("");
    customerRequest<{ orders: CustomerOrder[] }>(store.slug, "orders").then(result => { if (active) setOrders(result.orders); })
      .catch(() => { if (active) setOrdersError("We couldn't load your orders. Please try again."); })
      .finally(() => { if (active) setOrdersLoading(false); });
    return () => { active = false; };
  }, [store.slug, reloadOrders]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await account.saveProfile({ ...form, savedAddress: saveAddress ? address : null });
      setMessage({ text: "Your profile has been saved." });
    } catch (error) { setMessage({ error: true, text: error instanceof Error ? error.message : "Couldn't save your profile" }); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true);
    try { await account.signOut(); }
    catch { setMessage({ error: true, text: "Couldn't sign out. Please try again." }); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="font-heading text-3xl font-semibold">My account</h1><p className="mt-2 break-all text-sm text-store-muted">{customer.email}</p></div>
        <button type="button" disabled={busy} onClick={signOut} className="btn-secondary">Sign out</button>
      </div>
      <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
        <form onSubmit={save} className="rounded-media border border-store-line p-5 sm:p-6">
          <h2 className="font-heading text-xl font-semibold">Profile & delivery</h2>
          <p className="mt-2 text-sm text-store-muted">Your email is verified by Google. Delivery details are saved for this store.</p>
          <fieldset disabled={busy} className="mt-6 space-y-5">
            {([ ["firstName", "First name"], ["lastName", "Last name"], ["phone", "Phone number"] ] as const).map(([key, label]) => (
              <div key={key}><label className="field-label" htmlFor={`profile-${key}`}>{label}</label><input id={`profile-${key}`} className="field" type={key === "phone" ? "tel" : "text"} maxLength={key === "phone" ? 20 : 60} autoComplete={key === "phone" ? "tel" : key === "firstName" ? "given-name" : "family-name"} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></div>
            ))}
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={saveAddress} onChange={event => setSaveAddress(event.target.checked)} />Save a delivery address</label>
            {saveAddress && <div className="space-y-5 border-t border-store-line pt-5">
              {([ ["name", "Delivery name", "name"], ["phone", "Delivery phone", "tel"], ["line1", "Address", "address-line1"], ["line2", "Apartment or landmark (optional)", "address-line2"], ["city", "City", "address-level2"], ["postalCode", "Postal code (optional)", "postal-code"] ] as const).map(([key, label, autoComplete]) => (
                <div key={key}><label className="field-label" htmlFor={`address-${key}`}>{label}</label><input id={`address-${key}`} className="field" type={key === "phone" ? "tel" : "text"} autoComplete={autoComplete} required={!["line2", "postalCode"].includes(key)} value={address[key] || ""} onChange={event => setAddress({ ...address, [key]: event.target.value })} /></div>
              ))}
              <div><label className="field-label" htmlFor="address-district">District</label><select id="address-district" className="field" value={address.district || ""} autoComplete="address-level1" onChange={event => setAddress({ ...address, district: event.target.value })}><option value="">Choose district</option>{SRI_LANKA_DISTRICTS.map(district => <option key={district}>{district}</option>)}</select></div>
            </div>}
          </fieldset>
          {message && <p role={message.error ? "alert" : "status"} className={`mt-5 text-sm ${message.error ? "text-red-700" : "text-store-fg"}`}>{message.text}</p>}
          <button disabled={busy} type="submit" className="btn-primary mt-6">{busy ? "Please wait…" : "Save profile"}</button>
        </form>
        <section aria-labelledby="orders-heading" className="min-w-0">
          <h2 id="orders-heading" className="font-heading text-xl font-semibold">Your orders</h2>
          {ordersLoading ? <p role="status" className="mt-5 text-sm text-store-muted">Loading orders…</p> : ordersError ? <div className="mt-5"><p role="alert">{ordersError}</p><button className="btn-secondary mt-3" onClick={() => setReloadOrders(value => value + 1)}>Try again</button></div> : !orders.length ? <div className="mt-5 rounded-media bg-store-surface p-6"><p className="text-sm text-store-muted">Your orders will appear here after your first purchase.</p><Link href={`/${store.slug}/products`} className="mt-4 inline-block text-sm underline">Browse products</Link></div> : <ul className="mt-5 space-y-4">{orders.map(order => (
            <li key={order.id} className="rounded-media border border-store-line p-5">
              <div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">Order #{order.orderNumber}</h3><span className="text-sm">{formatMoney(order.totalCents, order.currency)}</span></div>
              <p className="mt-2 text-xs text-store-muted">{new Date(order.createdAt).toLocaleDateString()} · {order.status} · {order.fulfillmentStatus} · {order.paymentStatus}</p>
              <ul className="mt-4 space-y-1 text-sm">{order.items.map((item, index) => <li key={index}>{item.productName}{item.variantTitle ? ` (${item.variantTitle})` : ""} × {item.quantity}</li>)}</ul>
            </li>
          ))}</ul>}
        </section>
      </div>
    </div>
  );
}

export default function CustomerAccount({ store }: { store: PublicStore }) {
  const account = useCustomer();
  if (account.loading) return <p role="status" className="px-4 py-16 text-center text-store-muted">Loading your account…</p>;
  if (account.error) return <div className="px-4 py-16 text-center"><p role="alert">{account.error}</p><button className="btn-secondary mt-4" onClick={() => void account.refresh()}>Try again</button></div>;
  if (!account.customer) return <CustomerSignIn storeSlug={store.slug} />;
  return <AccountDetails key={account.customer.id} customer={account.customer} store={store} />;
}
