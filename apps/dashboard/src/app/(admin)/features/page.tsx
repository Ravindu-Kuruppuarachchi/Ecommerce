"use client";

import { useEffect, useState } from "react";
import { MODULES_CHANGED_EVENT } from "@/components/AdminShell";
import { errorMessage, storeApi } from "@/lib/api-client";

interface ModuleRow {
  key: string;
  label: string;
  description: string;
  core: boolean;
  available: boolean;
  enabled: boolean;
}

export default function FeaturesPage() {
  const [modules, setModules] = useState<ModuleRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    storeApi.modules().then((res) => setModules(res.data.modules)).catch((err) => setError(errorMessage(err)));
  }, []);

  const toggle = async (m: ModuleRow) => {
    setBusy(m.key);
    setError("");
    try {
      const res = await storeApi.setModule(m.key, !m.enabled);
      setModules(res.data.modules);
      window.dispatchEvent(new Event(MODULES_CHANGED_EVENT));
    } catch (err) {
      setError(errorMessage(err, "Couldn't change that feature"));
    } finally {
      setBusy(null);
    }
  };

  const optional = modules?.filter((m) => !m.core) ?? [];
  const included = modules?.filter((m) => m.core) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Features</h1>
      <p className="mt-1 text-sm text-gray-500">Turn on the tools you need. Your admin menu only shows what&apos;s on.</p>
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

      {!modules ? (
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-white" />
      ) : (
        <>
          <ul className="mt-8 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {optional.map((m) => (
              <li key={m.key} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {m.label}
                    {!m.available && <span className="badge badge-gray ml-2">Coming soon</span>}
                  </p>
                  <p className="text-sm text-gray-500">{m.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={m.enabled}
                  aria-label={m.label}
                  disabled={busy !== null || (!m.available && !m.enabled)}
                  onClick={() => toggle(m)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${m.enabled ? "bg-brand-600" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${m.enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm font-medium text-gray-900">Always included</p>
          <p className="mt-1 text-sm text-gray-500">{included.map((m) => m.label).join(", ")}</p>
        </>
      )}
    </div>
  );
}
