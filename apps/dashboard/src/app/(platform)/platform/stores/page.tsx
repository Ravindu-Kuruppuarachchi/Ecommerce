"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CaretDown, CaretUp, DownloadSimple } from "@phosphor-icons/react";
import { Balance, money, percent, RangePicker, StatusBadge, type Range } from "@/components/platform/shared";
import { errorMessage, platformApi } from "@/lib/api-client";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  templateKey: string;
  platformFeeBps: number;
  createdAt: string;
  owner: { email: string; firstName: string | null; lastName: string | null };
  orders: number;
  salesCents: number;
  feesCents: number;
  visitors: number;
  products: number;
  conversionRate: number | null;
  balanceCents: number;
  lastOrderAt: string | null;
}

type SortKey = "feesCents" | "salesCents" | "orders" | "visitors" | "balanceCents" | "createdAt" | "lastOrderAt";

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "salesCents", label: "Sales" },
  { key: "feesCents", label: "Our cut" },
  { key: "orders", label: "Orders" },
  { key: "visitors", label: "Visitors" },
  { key: "lastOrderAt", label: "Last order" },
  { key: "balanceCents", label: "Balance" },
];

const ago = (iso: string | null) => {
  if (!iso) return "Never";
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
};

function csv(rows: StoreRow[], days: number): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Store", "Slug", "Owner email", "Status", "Fee %", `Sales ${days}d (LKR)`, `Our cut ${days}d (LKR)`, `Orders ${days}d`, `Visitors ${days}d`, "Balance (LKR)", "Last order", "Signed up"];
  const lines = rows.map((r) =>
    [r.name, r.slug, r.owner.email, r.status, r.platformFeeBps / 100, (r.salesCents / 100).toFixed(2), (r.feesCents / 100).toFixed(2), r.orders, r.visitors, (r.balanceCents / 100).toFixed(2), r.lastOrderAt ?? "", r.createdAt]
      .map(esc)
      .join(","),
  );
  return [header.map(esc).join(","), ...lines].join("\n");
}

export default function PlatformStores() {
  const [days, setDays] = useState<Range>(30);
  const [rows, setRows] = useState<StoreRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "feesCents", desc: true });
  const [error, setError] = useState("");

  useEffect(() => {
    platformApi.stores(days).then((res) => setRows(res.data.stores)).catch((err) => setError(errorMessage(err)));
  }, [days]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const value = (r: StoreRow) => (sort.key === "createdAt" || sort.key === "lastOrderAt" ? new Date(r[sort.key] ?? 0).getTime() : r[sort.key]);
    return (rows ?? [])
      .filter((r) => (status === "all" || r.status === status) && `${r.name} ${r.slug} ${r.owner.email}`.toLowerCase().includes(q))
      .sort((a, b) => (sort.desc ? value(b) - value(a) : value(a) - value(b)));
  }, [rows, query, status, sort]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([csv(visible, days)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `stores-last-${days}-days.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const header = (key: SortKey, label: string) => (
    <th className="px-3 py-3 text-right font-medium" aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button type="button" onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))} className="inline-flex items-center gap-1 hover:text-gray-900">
        {label}
        {sort.key === key && (sort.desc ? <CaretDown size={12} /> : <CaretUp size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          {rows && <p className="mt-1 text-sm text-gray-500">{rows.length} merchant stores</p>}
        </div>
        <button type="button" onClick={download} disabled={!visible.length} className="btn-secondary">
          <DownloadSimple size={16} className="mr-1.5" /> Download CSV
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <RangePicker value={days} onChange={setDays} />
        <label htmlFor="store-status" className="sr-only">Status</label>
        <select id="store-status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-auto py-2">
          <option value="all">All statuses</option>
          <option value="live">Open</option>
          <option value="draft">Not launched</option>
          <option value="suspended">Suspended</option>
        </select>
        <label htmlFor="store-search" className="sr-only">Search stores</label>
        <input id="store-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, address or owner email" className="input-field w-72 py-2" />
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!rows ? (
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-white" />
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">No stores match.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Store</th>
                <th className="px-3 py-3 text-left font-medium">Status</th>
                {COLUMNS.map((c) => header(c.key, c.label))}
                <th className="px-4 py-3 text-right font-medium">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/platform/stores/${r.id}`} className="font-medium text-gray-900 hover:underline">{r.name}</Link>
                    <p className="text-xs text-gray-500">{r.owner.email}</p>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(r.salesCents)}</td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums">{money(r.feesCents)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.orders}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.visitors.toLocaleString()}
                    {r.conversionRate !== null && <span className="block text-xs text-gray-500">{percent(r.conversionRate)} conv.</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600">{ago(r.lastOrderAt)}</td>
                  <td className="px-3 py-3 text-right tabular-nums"><Balance cents={r.balanceCents} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.platformFeeBps / 100}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">Sales, our cut, orders and visitors cover the selected period. Balance and last order are all-time.</p>
    </div>
  );
}
