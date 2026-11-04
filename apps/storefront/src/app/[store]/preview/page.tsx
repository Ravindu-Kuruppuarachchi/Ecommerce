import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PreviewCanvas from "@/components/PreviewCanvas";
import { getStore } from "@/lib/api";

export const metadata: Metadata = { title: "Preview", robots: { index: false } };

/** Rendered inside the dashboard editor's iframe; content arrives by postMessage. */
export default async function PreviewPage({ params }: { params: { store: string } }) {
  const store = await getStore(params.store);
  if (!store) notFound();
  return <PreviewCanvas store={store} />;
}
