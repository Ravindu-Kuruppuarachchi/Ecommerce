"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@repo/core";
import { BarList, LineChart } from "@/components/charts/Charts";
import { analyticsApi, errorMessage } from "@/lib/api-client";

interface Analytics {
  days: number;
  currency: string;
  summary: { salesCents: number; orders: number; averageOrderCents: number; discountsCents: number; visitors: number; conversionRate: number | null };
  series: Array<{ day: string; orders: number; salesCents: number; visitors: number }>;
  funnel: Array<{ step: string; sessions: number }>;
  topProducts: Array<{ name: string; units: number; salesCents: number }>;
  byDistrict: Array<{ district: string; orders: number; salesCents: number }>;
}

const RANGES = [7, 30, 90] as const;

/** Rs 12.5K style, for axis ticks where space is tight. */
const compactMoney = (cents: number) =>
  `Rs ${new Intl.NumberFormat("en-LK", { notation: "compact", maximumFractionDigits: 1 }).format(cents / 100)}`;

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-LK", { day: "numeric", month: "short" });

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    analyticsApi
      .get(days)
      .then((res) => {
        setData(res.data);
        setError("");
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [days]);

  const money = (cents: number) => formatMoney(cents, data?.currency);
  const visitors = data?.funnel[0]?.sessions ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {/* Filters: one row, above everything they scope. */}
      <div className="mt-4 flex rounded-lg border border-gray-200 bg-white p-0.5 w-fit" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={days === r}
            onClick={() => setDays(r)}
            className={`rounded-md px-3 py-1.5 text-sm ${days === r ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}
          >
            Last {r} days
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!data ? (
        <div className="mt-6 space-y-6">
          <div className="h-24 animate-pulse rounded-xl bg-white" />
          <div className="h-72 animate-pulse rounded-xl bg-white" />
        </div>
      ) : (
        // Refetches keep the previous render, dimmed, instead of flashing a skeleton.
        <div className={`mt-6 space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Sales</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{money(data.summary.salesCents)}</p>
              <p className="mt-1 text-xs text-gray-500">Orders placed, excluding cancelled</p>
            </div>
            <Tile label="Orders" value={data.summary.orders.toLocaleString()} />
            <Tile label="Average order" value={money(data.summary.averageOrderCents)} />
            <Tile label="Visitors" value={data.summary.visitors.toLocaleString()} hint="Browser visits to your store" />
            <Tile
              label="Conversion rate"
              value={data.summary.conversionRate === null ? "No visits yet" : `${(data.summary.conversionRate * 100).toFixed(1)}%`}
              hint="Orders per visitor"
            />
          </div>

          <Card title={`Sales per day, last ${data.days} days`}>
            <LineChart
              ariaLabel={`Daily sales for the last ${data.days} days. Use the arrow keys to read each day.`}
              format={compactMoney}
              points={data.series.map((d) => ({
                label: shortDate(d.day),
                value: d.salesCents,
                details: [
                  { label: "Orders", value: String(d.orders) },
                  { label: "Visitors", value: String(d.visitors) },
                ],
              }))}
            />
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900">Show as a table</summary>
              <div className="mt-3 max-h-72 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white text-xs text-gray-500">
                    <tr><th className="py-1.5 font-medium">Day</th><th className="py-1.5 text-right font-medium">Sales</th><th className="py-1.5 text-right font-medium">Orders</th><th className="py-1.5 text-right font-medium">Visitors</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 tabular-nums">
                    {[...data.series].reverse().map((d) => (
                      <tr key={d.day}>
                        <td className="py-1.5">{shortDate(d.day)}</td>
                        <td className="py-1.5 text-right">{money(d.salesCents)}</td>
                        <td className="py-1.5 text-right">{d.orders}</td>
                        <td className="py-1.5 text-right">{d.visitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="From visit to order">
              <BarList
                empty="No visits recorded in this period."
                data={data.funnel.map((f) => ({
                  label: f.step,
                  value: f.sessions,
                  display: f.sessions.toLocaleString(),
                  note: visitors ? `${((f.sessions / visitors) * 100).toFixed(f.sessions / visitors < 0.1 ? 1 : 0)}%` : undefined,
                }))}
              />
              <p className="mt-4 text-xs text-gray-500">Each step counts visits that reached it. &ldquo;Placed an order&rdquo; counts orders.</p>
            </Card>
            <Card title="Top products by sales">
              <BarList
                empty="No sales in this period."
                data={data.topProducts.map((p) => ({ label: p.name, value: p.salesCents, display: money(p.salesCents), note: `${p.units} sold` }))}
              />
            </Card>
            <Card title="Sales by district">
              <BarList
                empty="No sales in this period."
                data={data.byDistrict.map((d) => ({ label: d.district, value: d.salesCents, display: money(d.salesCents), note: `${d.orders} ${d.orders === 1 ? "order" : "orders"}` }))}
              />
            </Card>
            <Card title="Discounts given">
              <p className="text-2xl font-semibold text-gray-900">{money(data.summary.discountsCents)}</p>
              <p className="mt-1 text-sm text-gray-500">Taken off orders in this period. Platform fees are charged on the amount after discounts.</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
