import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";
import { getStore } from "@/lib/api";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ params: pendingParams }: { params: Promise<{ store: string }> }) {
  const params = await pendingParams;
  const store = await getStore(params.store);
  if (!store) notFound();
  return <CheckoutForm store={store} />;
}
