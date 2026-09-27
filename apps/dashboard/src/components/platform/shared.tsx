"use client";

import { formatMoney } from "@repo/core";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export const money = (cents: number) => formatMoney(cents, "LKR");
export const compactMoney = (cents: number) =>
  `Rs ${new Intl.NumberFormat("en-LK", { notation: "compact", maximumFractionDigits: 1 }).format(cents / 100)}`;
export const percent = (ratio: number | null) => (ratio === null ? "No visits" : `${(ratio * 100).toFixed(1)}%`);
export const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-LK", { day: "numeric", month: "short" });

/** Date range presets: one row, above everything they scope. */
export function RangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex w-fit rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label="Date range">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={value === r}
          onClick={() => onChange(r)}
          className={`rounded-md px-3 py-1.5 text-sm ${value === r ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}
        >
          Last {r} days
        </button>
      ))}
    </div>
  );
}

export function Tile({ label, value, hint, wide }: { label: string; value: string; hint?: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 ${wide ? "col-span-2" : ""}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 font-semibold text-gray-900 ${wide ? "text-3xl" : "text-xl"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const STATUS_BADGE: Record<string, string> = { live: "badge-green", draft: "badge-gray", suspended: "badge-red" };
const STATUS_LABEL: Record<string, string> = { live: "Open", draft: "Not launched", suspended: "Suspended" };

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_BADGE[status] ?? "badge-gray"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

/** Ledger balance from the platform's side: positive = we owe the merchant, negative = they owe us. */
export function Balance({ cents }: { cents: number }) {
  if (cents === 0) return <span className="text-gray-500">Settled</span>;
  return cents < 0 ? (
    <span className="text-amber-700">Owes {money(-cents)}</span>
  ) : (
    <span className="text-gray-900">We owe {money(cents)}</span>
  );
}

/** Plain-language line for an audit entry. */
export function describeAudit(action: string, d: Record<string, unknown>): string {
  switch (action) {
    case "store.suspend":
      return `Suspended the store. Reason: ${d.reason}`;
    case "store.reactivate":
      return `Changed status from ${d.from} to ${d.to}. Reason: ${d.reason}`;
    case "store.fee_rate":
      return `Changed fee from ${Number(d.fromBps) / 100}% to ${Number(d.toBps) / 100}%. Reason: ${d.reason}`;
    case "ledger.fee_payment":
      return `Recorded a fee payment of ${money(Number(d.amountCents))} (${d.reference})`;
    case "ledger.payout":
      return `Recorded a payout of ${money(Number(d.amountCents))} (${d.reference})`;
    default:
      return action;
  }
}
