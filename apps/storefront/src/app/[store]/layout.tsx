import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StoreFooter from "@/components/StoreFooter";
import StoreShell from "@/components/StoreShell";
import { getStore } from "@/lib/api";
import { themeSettings, themeStyle } from "@/lib/theme";

type Params = { params: Promise<{ store: string }> };

export async function generateMetadata({ params: pendingParams }: Params): Promise<Metadata> {
  const params = await pendingParams;
  const store = await getStore(params.store);
  if (!store) return {};
  return {
    title: { default: store.name, template: `%s | ${store.name}` },
    description: store.description ?? undefined,
    icons: store.logo ? [{ url: store.logo }] : undefined,
  };
}

export default async function StoreLayout({ params: pendingParams, children }: Params & { children: React.ReactNode }) {
  const params = await pendingParams;
  const store = await getStore(params.store);
  if (!store) notFound();

  return (
    <div
      style={themeStyle(store.theme)}
      data-buttons={themeSettings(store.theme).buttons}
      className="flex min-h-[100dvh] flex-col bg-store-bg font-body text-store-fg"
    >
      <StoreShell store={store}>
        <main className="flex-1">{children}</main>
        <StoreFooter store={store} />
      </StoreShell>
    </div>
  );
}
