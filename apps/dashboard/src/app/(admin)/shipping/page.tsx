"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { formatMoney, SRI_LANKA_DISTRICTS, toMajorString } from "@repo/core";
import { errorMessage, shippingApi } from "@/lib/api-client";

interface Zone {
  id: string;
  name: string;
  districts: string[];
  rateCents: number;
  freeOverCents: number | null;
  estimatedDays: string | null;
}

interface Draft {
  id?: string;
  name: string;
  districts: string[];
  rate: string;
  freeOver: string;
  estimatedDays: string;
}

const emptyDraft: Draft = { name: "", districts: [], rate: "", freeOver: "", estimatedDays: "" };

function ZoneForm({ draft, taken, onCancel, onSaved }: { draft: Draft; taken: Map<string, string>; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (d: string) =>
    setForm((f) => ({ ...f, districts: f.districts.includes(d) ? f.districts.filter((x) => x !== d) : [...f.districts, d] }));
  const free = SRI_LANKA_DISTRICTS.filter((d) => !taken.has(d));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      name: form.name,
      districts: form.districts,
      rate: form.rate || "0",
      freeOver: form.freeOver.trim() ? form.freeOver : null,
      estimatedDays: form.estimatedDays.trim() || null,
    };
    try {
      await (form.id ? shippingApi.update(form.id, body) : shippingApi.create(body));
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the zone"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-brand-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="zone-name" className="mb-1.5 block text-sm font-medium text-gray-700">Zone name</label>
          <input id="zone-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Colombo and suburbs" className="input-field" />
        </div>
        <div>
          <label htmlFor="zone-days" className="mb-1.5 block text-sm font-medium text-gray-700">Delivery time shown to customers</label>
          <input id="zone-days" value={form.estimatedDays} onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })} placeholder="e.g. 2-3 working days" className="input-field" />
        </div>
        <div>
          <label htmlFor="zone-rate" className="mb-1.5 block text-sm font-medium text-gray-700">Delivery fee (LKR)</label>
          <input id="zone-rate" required inputMode="decimal" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="350" className="input-field" />
        </div>
        <div>
          <label htmlFor="zone-free" className="mb-1.5 block text-sm font-medium text-gray-700">Free delivery over (LKR, optional)</label>
          <input id="zone-free" inputMode="decimal" value={form.freeOver} onChange={(e) => setForm({ ...form, freeOver: e.target.value })} placeholder="5000" className="input-field" />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-gray-700">
          <span>Districts ({form.districts.length})</span>
          <span className="flex gap-3 text-xs font-normal">
            <button type="button" onClick={() => setForm({ ...form, districts: [...new Set([...form.districts, ...free])] })} className="text-brand-700 hover:underline">
              Add all remaining
            </button>
            <button type="button" onClick={() => setForm({ ...form, districts: [] })} className="text-gray-500 hover:underline">Clear</button>
          </span>
        </legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
          {SRI_LANKA_DISTRICTS.map((d) => {
            const owner = taken.get(d);
            const checked = form.districts.includes(d);
            return (
              <label
                key={d}
                title={owner ? `Already in ${owner}` : undefined}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${
                  owner ? "cursor-not-allowed border-gray-100 text-gray-400" : checked ? "border-brand-600 bg-brand-50 text-brand-900" : "cursor-pointer border-gray-200 hover:border-gray-300"
                }`}
              >
                <input type="checkbox" checked={checked} disabled={Boolean(owner)} onChange={() => toggle(d)} className="h-3.5 w-3.5 rounded border-gray-300" />
                {d}
              </label>
            );
          })}
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save zone"}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default function ShippingPage() {
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    shippingApi.zones().then((res) => setZones(res.data)).catch((err) => setError(errorMessage(err)));
  useEffect(() => {
    load();
  }, []);

  const remove = async (zone: Zone) => {
    if (!window.confirm(`Delete "${zone.name}"? Customers in its districts won't be able to order until another zone covers them.`)) return;
    try {
      await shippingApi.delete(zone.id);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const covered = new Set(zones?.flatMap((z) => z.districts) ?? []);
  const uncovered = SRI_LANKA_DISTRICTS.filter((d) => !covered.has(d));
  // Districts owned by zones other than the one being edited.
  const taken = new Map((zones ?? []).filter((z) => z.id !== editing?.id).flatMap((z) => z.districts.map((d) => [d, z.name] as const)));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping and delivery</h1>
          <p className="mt-1 text-sm text-gray-500">Group districts into zones and set a delivery fee for each. Customers pick their district at checkout.</p>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(emptyDraft)} className="btn-primary">
            <Plus size={16} className="mr-1.5" /> Add zone
          </button>
        )}
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {editing && (
        <div className="mb-6">
          <ZoneForm
            draft={editing}
            taken={taken}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        </div>
      )}

      {zones === null ? (
        <div className="h-40 animate-pulse rounded-xl bg-white" />
      ) : zones.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
          No zones yet. Customers can&apos;t check out until you add one.
        </p>
      ) : (
        <ul className="space-y-3">
          {zones.map((z) => (
            <li key={z.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{z.name}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatMoney(z.rateCents)}
                    {z.freeOverCents !== null && <> · free over {formatMoney(z.freeOverCents)}</>}
                    {z.estimatedDays && <> · {z.estimatedDays}</>}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">{z.districts.join(", ")}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${z.name}`}
                  onClick={() =>
                    setEditing({
                      id: z.id,
                      name: z.name,
                      districts: z.districts,
                      rate: toMajorString(z.rateCents),
                      freeOver: z.freeOverCents === null ? "" : toMajorString(z.freeOverCents),
                      estimatedDays: z.estimatedDays ?? "",
                    })
                  }
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                >
                  <PencilSimple size={16} />
                </button>
                <button type="button" aria-label={`Delete ${z.name}`} onClick={() => remove(z)} className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600">
                  <Trash size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {zones && zones.length > 0 && uncovered.length > 0 && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You don&apos;t deliver to {uncovered.length === 1 ? uncovered[0] : `${uncovered.length} districts`} yet
          {uncovered.length > 1 && <span className="block text-xs">{uncovered.join(", ")}</span>}
        </p>
      )}
    </div>
  );
}
