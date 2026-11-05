"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@repo/core";
import { errorMessage, payoutApi } from "@/lib/api-client";

interface Entry {
  id: string;
  type: string;
  amountCents: number;
  memo: string | null;
  createdAt: string;
  order: { orderNumber: number } | null;
}

const TYPE_LABEL: Record<string, string> = {
  sale: "Card sale",
  platform_fee: "Platform fee",
  refund: "Refund",
  fee_reversal: "Fee refunded",
  payout: "Payout to your bank",
  fee_payment: "Fee payment received",
  adjustment: "Adjustment",
};

export default function PayoutsPage() {
  const [data, setData] = useState<{ currency: string; balanceCents: number; entries: Entry[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    payoutApi.balance().then((res) => setData(res.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  const money = (cents: number) => formatMoney(cents, data?.currency);

  return (
    <div className="mx-auto merchant-content px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!data ? (
        <div className="mt-8 h-40 animate-pulse rounded-xl bg-white" />
      ) : (
        <>
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-500">{data.balanceCents >= 0 ? "We owe you" : "You owe in platform fees"}</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${data.balanceCents < 0 ? "text-amber-700" : "text-gray-900"}`}>
              {money(Math.abs(data.balanceCents))}
            </p>
            <p className="mt-3 max-w-prose text-sm text-gray-500">
              {data.balanceCents >= 0
                ? "Card payments are paid out to your bank account after the platform fee."
                : "For cash-on-delivery orders you keep the cash, so the 10% fee is deducted from your next card payout."}
            </p>
          </section>

          <h2 className="mb-3 mt-10 text-sm font-semibold text-gray-900">Activity</h2>
          {data.entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
              Fees and payouts appear here once orders are paid.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {data.entries.map((e) => (
                <li key={e.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      {TYPE_LABEL[e.type] ?? e.type}
                      {e.order && <span className="text-gray-500"> · Order #{e.order.orderNumber}</span>}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-sm font-medium tabular-nums ${e.amountCents < 0 ? "text-gray-700" : "text-emerald-700"}`}>
                    {e.amountCents < 0 ? "−" : "+"}
                    {money(Math.abs(e.amountCents))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
