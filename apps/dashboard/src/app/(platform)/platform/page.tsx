"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Warning } from "@phosphor-icons/react";
import { BarList, LineChart } from "@/components/charts/Charts";
import { Card, compactMoney, money, percent, RangePicker, shortDate, Tile, type Range } from "@/components/platform/shared";
import { errorMessage, platformApi } from "@/lib/api-client";

interface Overview {
  days: number;
  summary: {
    orders: number;
    salesCents: number;
    feesCents: number;
    feesPaidCents: number;
    visitors: number;
    averageOrderCents: number;
    conversionRate: number | null;
    stores: { total: number; live: number; draft: number; suspended: number; newInPeriod: number; withOrders: number };
    merchantsOweCents: number;
    weOweCents: number;
  };
  series: Array<{ day: string; orders: number; salesCents: number; feesCents: number; visitors: number; signups: number }>;
  funnel: Array<{ step: string; stores: number }>;
  alerts: Array<{ storeId: string; storeName: string; kind: string; message: string }>;
}

interface StoreRow {
  id: string;
  name: string;
  feesCents: number;
  orders: number;
}

export default function PlatformOverview() {
  const [days, setDays] = useState<Range>(30);
  const [data, setData] = useState<Overview | null>(null);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([platformApi.overview(days), platformApi.stores(days)])
      .then(([o, s]) => {
        setData(o.data);
        setStores(s.data.stores);
        setError("");
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [days]);

  const top = [...stores].filter((s) => s.feesCents > 0).sort((a, b) => b.feesCents - a.feesCents).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Platform overview</h1>
      <div className="mt-4"><RangePicker value={days} onChange={setDays} /></div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!data ? (
        <div className="mt-6 space-y-6">
          <div className="h-28 animate-pulse rounded-xl bg-white" />
          <div className="h-72 animate-pulse rounded-xl bg-white" />
        </div>
      ) : (
        <div className={`mt-6 space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <Tile
              wide
              label="Our revenue"
              value={money(data.summary.feesCents)}
              hint={`${money(data.summary.feesPaidCents)} from paid orders, ${money(data.summary.feesCents - data.summary.feesPaidCents)} awaiting payment`}
            />
            <Tile label="Total sales" value={compactMoney(data.summary.salesCents)} hint={money(data.summary.salesCents)} />
            <Tile label="Orders" value={data.summary.orders.toLocaleString()} hint={`Avg ${money(data.summary.averageOrderCents)}`} />
            <Tile label="Store visitors" value={data.summary.visitors.toLocaleString()} />
            <Tile label="Conversion" value={percent(data.summary.conversionRate)} hint="Orders per visitor" />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile label="Stores" value={`${data.summary.stores.live} open`} hint={`${data.summary.stores.total} total, ${data.summary.stores.draft} not launched, ${data.summary.stores.suspended} suspended`} />
            <Tile label="New signups" value={String(data.summary.stores.newInPeriod)} hint={`In the last ${data.days} days`} />
            <Tile label="Merchants owe us" value={money(data.summary.merchantsOweCents)} hint="Fees on cash-on-delivery orders" />
            <Tile label="We owe merchants" value={money(data.summary.weOweCents)} hint="Card sales awaiting payout" />
          </div>

          <Card title={`Our revenue per day, last ${data.days} days`}>
            <LineChart
              ariaLabel={`Platform fee revenue per day for the last ${data.days} days. Use the arrow keys to read each day.`}
              format={compactMoney}
              points={data.series.map((d) => ({
                label: shortDate(d.day),
                value: d.feesCents,
                details: [
                  { label: "Sales", value: money(d.salesCents) },
                  { label: "Orders", value: String(d.orders) },
                  { label: "Visitors", value: d.visitors.toLocaleString() },
                  { label: "New stores", value: String(d.signups) },
                ],
              }))}
            />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Needs attention" action={<Link href="/platform/stores" className="text-sm text-brand-700 hover:underline">All stores</Link>}>
              {data.alerts.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">Nothing needs attention.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.alerts.map((a, i) => (
                    <li key={i}>
                      <Link href={`/platform/stores/${a.storeId}`} className="flex items-start gap-3 py-3 hover:bg-gray-50">
                        <Warning size={18} className="mt-0.5 shrink-0 text-amber-600" />
                        <span className="text-sm">
                          <span className="font-medium text-gray-900">{a.storeName}</span>
                          <span className="block text-gray-600">{a.message}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Top stores by our revenue">
              <BarList empty="No sales in this period." data={top.map((s) => ({ label: s.name, value: s.feesCents, display: money(s.feesCents), note: `${s.orders} orders` }))} />
            </Card>
            <Card title={`Onboarding: stores that signed up in the last ${data.days} days`}>
              <BarList
                empty="No signups in this period."
                data={data.funnel[0].stores === 0 ? [] : data.funnel.map((f) => ({ label: f.step, value: f.stores, display: String(f.stores) }))}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
