"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { describeDiscount, discountProblem, formatMoney, toMajorString, type DiscountLike } from "@repo/core";
import { discountApi, errorMessage } from "@/lib/api-client";

interface Discount extends DiscountLike {
  _count: { orders: number };
}

interface Draft {
  id?: string;
  title: string;
  automatic: boolean;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: string;
  minSubtotal: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  active: boolean;
}

const emptyDraft: Draft = { title: "", automatic: false, code: "", type: "percent", value: "", minSubtotal: "", startsAt: "", endsAt: "", usageLimit: "", active: true };

const dateInput = (d: string | Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function status(d: Discount): { label: string; tone: string } {
  if (!d.active) return { label: "Off", tone: "badge-gray" };
  const now = new Date();
  if (d.startsAt && new Date(d.startsAt) > now) return { label: "Scheduled", tone: "badge-blue" };
  if (d.endsAt && new Date(d.endsAt) < now) return { label: "Expired", tone: "badge-gray" };
  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) return { label: "Used up", tone: "badge-gray" };
  return { label: "Active", tone: "badge-green" };
}

function DiscountForm({ draft, onCancel, onSaved }: { draft: Draft; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      title: form.title,
      code: form.automatic ? null : form.code,
      type: form.type,
      value: form.type === "free_shipping" ? undefined : form.value,
      minSubtotal: form.minSubtotal.trim() || "0",
      // Dates are whole days: start of the start day, end of the end day.
      startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : null,
      endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : null,
      usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : null,
      active: form.active,
    };
    try {
      await (form.id ? discountApi.update(form.id, body) : discountApi.create(body));
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the discount"));
    } finally {
      setSaving(false);
    }
  };

  const label = "mb-1.5 block text-sm font-medium text-gray-700";
  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-brand-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="d-title" className={label}>Name</label>
          <input id="d-title" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Avurudu sale" className="input-field" />
          <p className="mt-1 text-xs text-gray-500">Customers see this at checkout.</p>
        </div>
        <fieldset>
          <legend className={label}>How it applies</legend>
          <div className="flex gap-4 pt-2 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={!form.automatic} onChange={() => set("automatic", false)} /> Customer enters a code</label>
            <label className="flex items-center gap-2"><input type="radio" checked={form.automatic} onChange={() => set("automatic", true)} /> Automatic</label>
          </div>
        </fieldset>
        {!form.automatic && (
          <div>
            <label htmlFor="d-code" className={label}>Code</label>
            <input id="d-code" required value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="AVURUDU15" className="input-field font-mono uppercase" />
          </div>
        )}
        <div>
          <label htmlFor="d-type" className={label}>Type</label>
          <select id="d-type" value={form.type} onChange={(e) => set("type", e.target.value as Draft["type"])} className="input-field">
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
            <option value="free_shipping">Free delivery</option>
          </select>
        </div>
        {form.type !== "free_shipping" && (
          <div>
            <label htmlFor="d-value" className={label}>{form.type === "percent" ? "Percentage" : "Amount (LKR)"}</label>
            <input id="d-value" required inputMode="decimal" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder={form.type === "percent" ? "10" : "500"} className="input-field" />
          </div>
        )}
        <div>
          <label htmlFor="d-min" className={label}>Minimum spend (LKR, optional)</label>
          <input id="d-min" inputMode="decimal" value={form.minSubtotal} onChange={(e) => set("minSubtotal", e.target.value)} placeholder="0" className="input-field" />
        </div>
        <div>
          <label htmlFor="d-limit" className={label}>Total uses allowed (optional)</label>
          <input id="d-limit" type="number" min={1} value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="Unlimited" className="input-field" />
        </div>
        <div>
          <label htmlFor="d-start" className={label}>Starts (optional)</label>
          <input id="d-start" type="date" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className="input-field" />
        </div>
        <div>
          <label htmlFor="d-end" className={label}>Ends (optional)</label>
          <input id="d-end" type="date" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} className="input-field" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
        Active
      </label>
      <p className="text-xs text-gray-500">Only one discount applies per order. If several qualify, the customer gets whichever saves them the most.</p>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save discount"}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  const load = () => discountApi.list().then((res) => setDiscounts(res.data)).catch((err) => setError(errorMessage(err)));
  useEffect(() => {
    load();
  }, []);

  const remove = async (d: Discount) => {
    if (!window.confirm(`Delete "${d.title}"? Past orders keep their discount.`)) return;
    try {
      await discountApi.delete(d.id);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const edit = (d: Discount) =>
    setEditing({
      id: d.id,
      title: d.title,
      automatic: d.code === null,
      code: d.code ?? "",
      type: d.type as Draft["type"],
      value: d.type === "free_shipping" ? "" : toMajorString(d.value).replace(/\.00$/, ""),
      minSubtotal: d.minSubtotalCents ? toMajorString(d.minSubtotalCents) : "",
      startsAt: dateInput(d.startsAt),
      endsAt: dateInput(d.endsAt),
      usageLimit: d.usageLimit === null ? "" : String(d.usageLimit),
      active: d.active,
    });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discounts</h1>
          <p className="mt-1 text-sm text-gray-500">Codes customers enter at checkout, or automatic discounts for everyone who qualifies.</p>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(emptyDraft)} className="btn-primary">
            <Plus size={16} className="mr-1.5" /> Create discount
          </button>
        )}
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {editing && (
        <div className="mb-6">
          <DiscountForm draft={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </div>
      )}

      {discounts === null ? (
        <div className="h-40 animate-pulse rounded-xl bg-white" />
      ) : discounts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">No discounts yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {discounts.map((d) => {
            const s = status(d);
            const reason = s.label === "Active" ? null : discountProblem(d, Number.MAX_SAFE_INTEGER);
            return (
              <li key={d.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                    {d.code ? <span className="font-mono">{d.code}</span> : <span>{d.title}</span>}
                    <span className={`badge ${s.tone}`} title={reason ?? undefined}>{s.label}</span>
                    {!d.code && <span className="badge badge-blue">Automatic</span>}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {describeDiscount(d, (c) => formatMoney(c))}
                    {d.minSubtotalCents > 0 && <> on orders over {formatMoney(d.minSubtotalCents)}</>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.usageLimit !== null ? `Used ${d.usedCount} of ${d.usageLimit}` : `Used ${d.usedCount} ${d.usedCount === 1 ? "time" : "times"}`}
                    {d.endsAt && <> · ends {new Date(d.endsAt).toLocaleDateString()}</>}
                  </p>
                </div>
                <button type="button" aria-label={`Edit ${d.title}`} onClick={() => edit(d)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
                  <PencilSimple size={16} />
                </button>
                <button type="button" aria-label={`Delete ${d.title}`} onClick={() => remove(d)} className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600">
                  <Trash size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
