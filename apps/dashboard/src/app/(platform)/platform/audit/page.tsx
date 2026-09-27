"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { describeAudit } from "@/components/platform/shared";
import { errorMessage, platformApi } from "@/lib/api-client";

interface Entry {
  id: string;
  action: string;
  storeId: string | null;
  storeName: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  actor: { email: string };
}

export default function AuditLog() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    platformApi.audit().then((res) => setEntries(res.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Audit log</h1>
      <p className="mt-1 text-sm text-gray-500">Every change platform staff make to a store or its money, newest first.</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!entries ? (
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-white" />
      ) : entries.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">No admin actions yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {entries.map((e) => (
            <li key={e.id} className="px-5 py-4">
              <p className="text-sm text-gray-900">
                {e.storeId ? (
                  <Link href={`/platform/stores/${e.storeId}`} className="font-medium hover:underline">{e.storeName}</Link>
                ) : (
                  <span className="font-medium">Platform</span>
                )}
                <span className="text-gray-600">: {describeAudit(e.action, e.details)}</span>
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{e.actor.email} · {new Date(e.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
