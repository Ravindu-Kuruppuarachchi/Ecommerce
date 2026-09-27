"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { TEMPLATES, type TemplateKey } from "@repo/core";
import { LineChart } from "@/components/charts/Charts";
import { Balance, Card, compactMoney, describeAudit, money, percent, RangePicker, shortDate, StatusBadge, Tile, type Range } from "@/components/platform/shared";
import { errorMessage, platformApi } from "@/lib/api-client";
import { storefrontUrl } from "@/lib/urls";

interface Detail {
  days: number;
  store: {
    id: string;
    name: string;
    slug: string;
    status: string;
    templateKey: string;
    platformFeeBps: number;
    createdAt: string;
    email: string | null;
    phone: string | null;
    owner: { email: string; firstName: string | null; lastName: string | null; createdAt: string };
    domains: Array<{ hostname: string; status: string }>;
    payoutAccount: { accountName: string; bankName: string; branch: string; accountNumber: string } | null;
  };
  modules: Array<{ key: string; label: string; core: boolean }>;
  productCount: number;
  period: { orders: number; salesCents: number; feesCents: number; feesPaidCents: number; visitors: number; conversionRate: number | null };
  lifetime: { orders: number; salesCents: number; feesCents: number };
  balanceCents: number;
  series: Array<{ day: string; orders: number; salesCents: number; feesCents: number; visitors: number }>;
  recentOrders: Array<{ id: string; orderNumber: number; totalCents: number; platformFeeCents: number; status: string; paymentStatus: string; paymentMethod: string; createdAt: string }>;
  ledger: Array<{ id: string; type: string; amountCents: number; memo: string | null; createdAt: string; order: { orderNumber: number } | null }>;
  audit: Array<{ id: string; action: string; details: Record<string, unknown>; createdAt: string; actor: { email: string } }>;
}

const LEDGER_LABEL: Record<string, string> = {
  sale: "Card sale",
  platform_fee: "Platform fee",
  refund: "Refund",
  fee_reversal: "Fee refunded",
  payout: "Payout to merchant",
  fee_payment: "Fee payment from merchant",
  adjustment: "Adjustment",
};

function MoneyActions({ detail, onDone }: { detail: Detail; onDone: () => void }) {
  const owes = detail.balanceCents < 0;
  const kind = owes ? "fee_payment" : "payout";
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (detail.balanceCents === 0) return <p className="text-sm text-gray-500">Nothing is owed either way.</p>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await platformApi.recordMoney(detail.store.id, { kind, amount, reference });
      setAmount("");
      setReference("");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-gray-600">
        {owes ? "Record a fee payment the merchant made to us (bank transfer or cash)." : "Record a bank transfer we sent to the merchant."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="m-amount" className="mb-1 block text-xs font-medium text-gray-600">Amount (LKR)</label>
          <input id="m-amount" required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={(Math.abs(detail.balanceCents) / 100).toFixed(2)} className="input-field py-2" />
        </div>
        <div>
          <label htmlFor="m-ref" className="mb-1 block text-xs font-medium text-gray-600">Bank or receipt reference</label>
          <input id="m-ref" required value={reference} onChange={(e) => setReference(e.target.value)} className="input-field py-2" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary">{busy ? "Saving…" : owes ? "Record fee payment" : "Record payout"}</button>
    </form>
  );
}

function StoreActions({ detail, onDone }: { detail: Detail; onDone: () => void }) {
  const [fee, setFee] = useState(String(detail.store.platformFeeBps / 100));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const suspended = detail.store.status === "suspended";

  const act = async (change: { status?: string; platformFeeBps?: number }, confirmText?: string) => {
    if (reason.trim().length < 3) {
      setError("Add a reason first. It's saved in the audit log.");
      return;
    }
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      await platformApi.updateStore(detail.store.id, { ...change, reason });
      setReason("");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const feeBps = Math.round(Number(fee) * 100);
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="a-reason" className="mb-1 block text-xs font-medium text-gray-600">Reason (required for any change)</label>
        <input id="a-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fraud report from customer, 12 Sep" className="input-field py-2" />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="a-fee" className="mb-1 block text-xs font-medium text-gray-600">Platform fee (%)</label>
          <input id="a-fee" type="number" min={0} max={30} step={0.5} value={fee} onChange={(e) => setFee(e.target.value)} className="input-field w-28 py-2" />
        </div>
        <button
          type="button"
          disabled={busy || !Number.isFinite(feeBps) || feeBps === detail.store.platformFeeBps}
          onClick={() => act({ platformFeeBps: feeBps })}
          className="btn-secondary py-2"
        >
          Change fee
        </button>
      </div>
      <p className="text-xs text-gray-500">A new rate applies to future orders only. Existing orders keep the rate they were placed at.</p>
      <div className="border-t border-gray-100 pt-4">
        {suspended ? (
          <button type="button" disabled={busy} onClick={() => act({ status: "live" })} className="btn-secondary">Reactivate store</button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => act({ status: "suspended" }, `Suspend ${detail.store.name}? Its storefront goes offline and it can't take orders.`)}
            className="btn-danger"
          >
            Suspend store
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}

export default function PlatformStoreDetail() {
  const { id } = useParams<{ id: string }>();
  const [days, setDays] = useState<Range>(30);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    platformApi.store(id, days).then((res) => setData(res.data)).catch((err) => setError(errorMessage(err, "Store not found")));
  }, [id, days, version]);

  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!data) return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8"><div className="h-96 animate-pulse rounded-xl bg-white" /></div>;

  const { store, period, lifetime } = data;
  const owner = [store.owner.firstName, store.owner.lastName].filter(Boolean).join(" ");
  const reload = () => setVersion((v) => v + 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <Link href="/platform/stores" className="text-sm text-gray-500 hover:text-gray-900">Stores</Link>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">{store.name} <StatusBadge status={store.status} /></h1>
          <p className="mt-1 text-sm text-gray-500">
            {owner ? `${owner}, ` : ""}{store.owner.email} · signed up {new Date(store.createdAt).toLocaleDateString()} · {TEMPLATES[store.templateKey as TemplateKey]?.name ?? store.templateKey} template · {data.productCount} products
          </p>
        </div>
        <a href={storefrontUrl(store.slug)} target="_blank" rel="noreferrer" className="btn-secondary">
          View store <ArrowSquareOut size={14} className="ml-1.5" />
        </a>
      </div>

      <div className="mt-6"><RangePicker value={days} onChange={setDays} /></div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Tile label="Our cut" value={money(period.feesCents)} hint={`${money(period.feesPaidCents)} from paid orders`} />
        <Tile label="Sales" value={money(period.salesCents)} />
        <Tile label="Orders" value={String(period.orders)} />
        <Tile label="Visitors" value={period.visitors.toLocaleString()} />
        <Tile label="Conversion" value={percent(period.conversionRate)} />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        All time: {money(lifetime.salesCents)} in sales over {lifetime.orders} orders, {money(lifetime.feesCents)} in fees.
      </p>

      <div className="mt-6">
        <Card title={`Sales per day, last ${data.days} days`}>
          <LineChart
            ariaLabel={`${store.name} daily sales. Use the arrow keys to read each day.`}
            format={compactMoney}
            points={data.series.map((d) => ({
              label: shortDate(d.day),
              value: d.salesCents,
              details: [
                { label: "Our cut", value: money(d.feesCents) },
                { label: "Orders", value: String(d.orders) },
                { label: "Visitors", value: String(d.visitors) },
              ],
            }))}
          />
        </Card>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <Card title="Money">
          <p className="mb-4 text-2xl font-semibold"><Balance cents={data.balanceCents} /></p>
          <MoneyActions detail={data} onDone={reload} />
          {store.payoutAccount ? (
            <p className="mt-4 text-xs text-gray-500">
              Pays out to {store.payoutAccount.accountName}, {store.payoutAccount.bankName} {store.payoutAccount.branch}, account ending {store.payoutAccount.accountNumber.slice(-4)}
            </p>
          ) : (
            <p className="mt-4 text-xs text-gray-500">No bank account on file for payouts.</p>
          )}
        </Card>
        <Card title="Manage store">
          <StoreActions key={version} detail={data} onDone={reload} />
        </Card>
        <Card title="Features in use">
          <div className="flex flex-wrap gap-2">
            {data.modules.map((m) => (
              <span key={m.key} className={`badge ${m.core ? "badge-gray" : "badge-blue"}`}>{m.label}</span>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">Grey features come with every store; blue ones the merchant turned on.</p>
          {store.domains.length > 0 && (
            <p className="mt-3 text-sm text-gray-600">Domains: {store.domains.map((d) => `${d.hostname} (${d.status})`).join(", ")}</p>
          )}
          {(store.email || store.phone) && <p className="mt-3 text-sm text-gray-600">Store contact: {[store.email, store.phone].filter(Boolean).join(", ")}</p>}
        </Card>
        <Card title="Recent orders">
          {data.recentOrders.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr><th className="pb-2 font-medium">Order</th><th className="pb-2 font-medium">Status</th><th className="pb-2 text-right font-medium">Total</th><th className="pb-2 text-right font-medium">Fee</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2">#{o.orderNumber}<span className="block text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</span></td>
                    <td className="py-2 text-xs text-gray-600">{o.status}, {o.paymentStatus}</td>
                    <td className="py-2 text-right tabular-nums">{money(o.totalCents)}</td>
                    <td className="py-2 text-right tabular-nums">{money(o.platformFeeCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Ledger">
          {data.ledger.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">No money movements yet.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto pr-1 text-sm">
              {data.ledger.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {LEDGER_LABEL[e.type] ?? e.type}
                    {e.order && <span className="text-gray-500"> · #{e.order.orderNumber}</span>}
                    <span className="block text-xs text-gray-500">{new Date(e.createdAt).toLocaleDateString()}{e.memo && !e.order ? ` · ${e.memo}` : ""}</span>
                  </span>
                  <span className={`tabular-nums ${e.amountCents < 0 ? "text-gray-700" : "text-emerald-700"}`}>
                    {e.amountCents < 0 ? "−" : "+"}{money(Math.abs(e.amountCents))}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-gray-500">From the merchant&apos;s side: + means the platform owes them, − means they owe the platform.</p>
        </Card>
        <Card title="Admin history">
          {data.audit.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">No admin actions on this store.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {data.audit.map((a) => (
                <li key={a.id} className="py-2">
                  <p className="text-gray-900">{describeAudit(a.action, a.details)}</p>
                  <p className="text-xs text-gray-500">{a.actor.email} · {new Date(a.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
