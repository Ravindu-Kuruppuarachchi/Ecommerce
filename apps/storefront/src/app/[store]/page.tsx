import { HOME_PAGE_SLUG } from "@repo/core";
import { notFound } from "next/navigation";
import Sections from "@/components/sections/Sections";
import { getPage, getStore, loadSectionProducts } from "@/lib/api";

export default async function StoreHome({ params: pendingParams }: { params: Promise<{ store: string }> }) {
  const params = await pendingParams;
  const [store, page] = await Promise.all([getStore(params.store), getPage(params.store, HOME_PAGE_SLUG)]);
  if (!store) notFound();

  // A store always gets a home page from its template; fall back to a product grid if it was removed.
  const sections = page?.sections ?? [{ id: "fallback", type: "featured-products" as const, props: { heading: "Products", limit: 12 } }];
  const products = await loadSectionProducts(store.slug, sections);
  return <Sections sections={sections} ctx={{ store, products, preview: false }} />;
}
