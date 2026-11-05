"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@repo/core";
import { customerApi, errorMessage } from "@/lib/api-client";

interface Customer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  spentCents: number;
}

export default function CustomersPage() {
  const [data, setData] = useState<{ currency: string; subscriberCount: number; customers: Customer[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    customerApi.list().then((res) => setData(res.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <div className="mx-auto merchant-content px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
      {data && (
        <p className="mt-1 text-sm text-gray-500">
          {data.customers.length} {data.customers.length === 1 ? "customer" : "customers"}, {data.subscriberCount} newsletter{" "}
          {data.subscriberCount === 1 ? "subscriber" : "subscribers"}
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!data ? (
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-white" />
      ) : data.customers.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500">
          Customers appear here after their first order.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 text-right font-medium">Orders</th>
                <th className="px-5 py-3 text-right font-medium">Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3">
                    <p className="text-gray-900">{[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}</p>
                    {(c.firstName || c.lastName) && <p className="text-xs text-gray-500">{c.email}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.phone ?? ""}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.orderCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatMoney(c.spentCents, data.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
