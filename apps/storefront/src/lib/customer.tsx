"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { CustomerProfile } from "@repo/core";

interface CustomerState {
  customer: CustomerProfile | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  saveProfile: (data: unknown) => Promise<void>;
  signOut: () => Promise<void>;
}
const CustomerContext = createContext<CustomerState | null>(null);

export async function customerRequest<T>(store: string, action: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/customer/${encodeURIComponent(store)}/${action}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options.headers } });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.details?.[0]?.message ?? data?.error ?? "Please try again") as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return data;
}

/** One customer provider for every storefront template, independent of the merchant dashboard. */
export function CustomerProvider({ storeSlug, children }: { storeSlug: string; children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await customerRequest<{ customer: CustomerProfile }>(storeSlug, "session");
      setCustomer(result.customer);
    } catch (error) {
      setCustomer(null);
      if ((error as { status?: number }).status !== 401) setError("We couldn't load your account. Please try again.");
    } finally { setLoading(false); }
  }, [storeSlug]);
  useEffect(() => { setCustomer(null); void refresh(); }, [refresh]);
  async function saveProfile(data: unknown) {
    const result = await customerRequest<{ customer: CustomerProfile }>(storeSlug, "profile", { method: "PATCH", body: JSON.stringify(data) });
    setCustomer(result.customer);
  }
  async function signOut() {
    try { await customerRequest(storeSlug, "session", { method: "DELETE" }); }
    catch (error) { if ((error as { status?: number }).status !== 401) throw error; }
    setCustomer(null);
  }
  return <CustomerContext.Provider value={{ customer, loading, error, refresh, saveProfile, signOut }}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) throw new Error("useCustomer requires CustomerProvider");
  return context;
}
