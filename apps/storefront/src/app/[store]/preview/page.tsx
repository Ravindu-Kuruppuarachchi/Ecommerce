import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PreviewCanvas from "@/components/PreviewCanvas";
import { getStore } from "@/lib/api";

// Editor chrome must reflect newly published pages immediately, including layout data.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Preview", robots: { index: false } };

/** Rendered inside the dashboard editor's iframe; content arrives by postMessage. */
export default async function PreviewPage({ params: pendingParams }: { params: Promise<{ store: string }> }) {
  const params = await pendingParams;
  const store = await getStore(params.store);
  if (!store) notFound();
  return <PreviewCanvas store={store} />;
}
