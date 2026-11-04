import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CustomerAccount from "@/components/CustomerAccount";
import { getStore } from "@/lib/api";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };
export default async function AccountPage({ params: pendingParams }: { params: Promise<{ store: string }> }) {
  const params = await pendingParams;
  const store = await getStore(params.store);
  if (!store) notFound();
  return <CustomerAccount store={store} />;
}
