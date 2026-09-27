"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Warning } from "@phosphor-icons/react";
import { errorMessage, inventoryApi, storeApi } from "@/lib/api-client";

interface Row {
  productId: string;
  productName: string;
  status: string;
  image: string | null;
  variantId: string | null;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  low: boolean;
}

interface HistoryEntry {
  id: string;
  change: number;
  quantityAfter: number;
  reason: string;
  note: string | null;
  createdAt: string;
  product: { name: string };
  variant: { title: string } | null;
}

const REASONS = [
  { value: "restock", label: "Received stock" },
  { value: "correction", label: "Count correction" },
  { value: "damaged", label: "Damaged or lost" },
];

const REASON_LABEL: Record<string, string> = {
  restock: "Received stock",
  correction: "Correction",
  damaged: "Damaged or lost",
  order: "Sold",
  cancellation: "Order cancelled",
};

function StockEditor({ row, onSaved }: { row: Row; onSaved: (quantity: number) => void }) {
  const [value, setValue] = useState(String(row.quantity));
  const [reason, setReason] = useState("restock");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setValue(String(row.quantity)), [row.quantity]);

  const target = Number(value);
  const changed = value.trim() !== "" && Number.isInteger(target) && target >= 0 && target !== row.quantity;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await inventoryApi.adjust({ productId: row.productId, variantId: row.variantId, mode: "set", amount: target, reason });
      onSaved(res.data.quantity);
    } catch (err) {
      setError(errorMessage(err, "Couldn't update stock"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <label className="sr-only" htmlFor={`qty-${row.productId}-${row.variantId}`}>Stock for {row.productName} {row.variantTitle}</label>
      <input
        id={`qty-${row.productId}-${row.variantId}`}
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && changed && save()}
        className={`input-field w-24 py-1.5 text-right tabular-nums ${row.low ? "border-amber-400" : ""}`}
      />
      {changed && (
        <>
          <label className="sr-only" htmlFor={`reason-${row.productId}-${row.variantId}`}>Reason</label>
          <select id={`reason-${row.productId}-${row.variantId}`} value={reason} onChange={(e) => setReason(e.target.value)} className="input-field w-auto py-1.5 text-xs">
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button type="button" onClick={save} disabled={saving} className="btn-primary px-3 py-1.5 text-xs">{saving ? "Saving" : "Save"}</button>
        </>
      )}
      {error && <p className="w-full text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function InventoryPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [threshold, setThreshold] = useState(5);
  const [thresholdInput, setThresholdInput] = useState("5");
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([inventoryApi.list(), inventoryApi.history()])
      .then(([inv, hist]) => {
        setRows(inv.data.rows);
        setThreshold(inv.data.threshold);
        setThresholdInput(String(inv.data.threshold));
        setHistory(hist.data);
      })
      .catch((err) => setError(errorMessage(err)));
  useEffect(() => {
    load();
  }, []);

  const saveThreshold = async () => {
    const n = Number(thresholdInput);
    if (!Number.isInteger(n) || n < 0) return;
    try {
      await storeApi.update({ lowStockThreshold: n });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const lowCount = rows?.filter((r) => r.low).length ?? 0;
  const visible = (rows ?? []).filter(
    (r) => (filter === "all" || r.low) && `${r.productName} ${r.variantTitle ?? ""} ${r.sku ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
      <p className="mt-1 text-sm text-gray-500">Stock for every product and variant. Changes are logged below.</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {lowCount > 0 && (
        <p className="mt-6 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Warning size={18} /> {lowCount} {lowCount === 1 ? "item is" : "items are"} at or below {threshold} in stock.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label="Filter">
            {(["all", "low"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm ${filter === f ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}
              >
                {f === "all" ? "All" : `Low stock (${lowCount})`}
              </button>
            ))}
          </div>
          <label htmlFor="inv-search" className="sr-only">Search</label>
          <input id="inv-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or SKU" className="input-field w-56 py-2" />
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label htmlFor="threshold" className="mb-1 block text-xs font-medium text-gray-600">Low stock at or below</label>
            <input id="threshold" type="number" min={0} value={thresholdInput} onChange={(e) => setThresholdInput(e.target.value)} className="input-field w-24 py-2" />
          </div>
          {thresholdInput !== String(threshold) && <button type="button" onClick={saveThreshold} className="btn-secondary py-2">Save</button>}
        </div>
      </div>

      {rows === null ? (
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-white" />
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
          {rows.length === 0 ? "Add products to track their stock here." : filter === "low" ? "Nothing is running low." : "No matches."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 text-right font-medium">In stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((row) => (
                <tr key={`${row.productId}-${row.variantId}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {row.image ? <img src={row.image} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="h-10 w-10 rounded-md bg-gray-100" />}
                      <div>
                        <Link href={`/products/${row.productId}/edit`} className="font-medium text-gray-900 hover:underline">{row.productName}</Link>
                        {row.variantTitle && <p className="text-xs text-gray-500">{row.variantTitle}</p>}
                        {row.status === "draft" && <span className="badge badge-gray mt-0.5">Draft</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.sku ?? ""}</td>
                  <td className="px-4 py-3">
                    <StockEditor
                      row={row}
                      onSaved={(quantity) => {
                        setRows((rs) => rs!.map((r) => (r === row ? { ...r, quantity, low: quantity <= threshold } : r)));
                        inventoryApi.history().then((res) => setHistory(res.data)).catch(() => undefined);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-12 text-sm font-semibold text-gray-900">Recent stock changes</h2>
      {history && history.length === 0 ? (
        <p className="text-sm text-gray-500">No changes yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {(history ?? []).slice(0, 25).map((h) => (
            <li key={h.id} className="flex items-center gap-4 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-gray-900">
                  {h.product.name}
                  {h.variant && <span className="text-gray-500"> · {h.variant.title}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {REASON_LABEL[h.reason] ?? h.reason}
                  {h.note && <> · {h.note}</>} · {new Date(h.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`tabular-nums font-medium ${h.change < 0 ? "text-gray-700" : "text-emerald-700"}`}>
                {h.change > 0 ? "+" : "−"}
                {Math.abs(h.change)}
              </span>
              <span className="w-16 text-right text-xs tabular-nums text-gray-500">→ {h.quantityAfter}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
