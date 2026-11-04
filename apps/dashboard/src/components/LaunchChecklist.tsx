"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Circle } from "@phosphor-icons/react";
import { errorMessage, storeApi } from "@/lib/api-client";
import { storefrontUrl } from "@/lib/urls";
import { useAuthStore } from "@/stores/auth-store";

interface Setup {
  productCount: number;
  homeCustomized: boolean;
  hasLogo: boolean;
}

/** Onboarding steps shown on Home until the store goes live. */
export default function LaunchChecklist() {
  const { store, setStore } = useAuthStore();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    storeApi
      .getMe()
      .then((res) => {
        setSetup(res.data.setup);
        setStatus(res.data.status);
      })
      .catch((err) => setError(errorMessage(err, "Couldn't load your setup progress")));
  }, []);

  if (!store || status === "live" || status === "suspended") return null;
  if (!setup) return error ? <p className="mb-8 text-sm text-red-600">{error}</p> : <div className="mb-8 h-48 animate-pulse rounded-xl bg-white" />;

  const steps = [
    { done: true, label: "Pick a template", href: "/store", action: "Change" },
    { done: setup.productCount > 0, label: "Add your first product", href: "/products/new", action: "Add product" },
    { done: setup.homeCustomized, label: "Customise your home page", href: "/store/pages/home", action: "Open editor" },
    { done: setup.hasLogo, label: "Add your logo", href: "/settings", action: "Settings", optional: true },
  ];
  const ready = steps.every((s) => s.done || s.optional);

  const launch = async () => {
    setLaunching(true);
    setError("");
    try {
      const res = await storeApi.update({ status: "live" });
      setStatus(res.data.status);
      setStore({ ...store, status: res.data.status });
    } catch (err) {
      setError(errorMessage(err, "Couldn't open your store"));
    } finally {
      setLaunching(false);
    }
  };

  return (
    <section className="mb-10 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-base font-semibold text-gray-900">Get your store ready</h2>
      <p className="mt-1 text-sm text-gray-500">
        Customers can browse{" "}
        <a href={storefrontUrl(store.slug)} target="_blank" rel="noreferrer" className="text-brand-700 underline-offset-2 hover:underline">
          your store
        </a>{" "}
        now, but checkout stays off until you open it.
      </p>
      <ol className="mt-5 divide-y divide-gray-100">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3 py-3">
            {step.done ? <CheckCircle size={22} weight="fill" className="text-emerald-600" /> : <Circle size={22} className="text-gray-300" />}
            <span className={`flex-1 text-sm ${step.done ? "text-gray-500" : "text-gray-900"}`}>
              {step.label}
              {step.optional && <span className="ml-2 text-xs text-gray-400">Optional</span>}
            </span>
            <Link href={step.href} className="text-sm font-medium text-brand-700 hover:underline">
              {step.action}
            </Link>
          </li>
        ))}
      </ol>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={launch} disabled={!ready || launching} className="btn-primary">
          {launching ? "Opening…" : "Open my store"}
        </button>
        {!ready && <span className="text-sm text-gray-500">Finish the steps above first.</span>}
      </div>
    </section>
  );
}
