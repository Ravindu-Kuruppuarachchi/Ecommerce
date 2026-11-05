import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS_PAGE_SLUG, defaultCatalogSections } from "@repo/core";
import Sections from "@/components/sections/Sections";
import { getPage, getStore, loadSectionProducts } from "@/lib/api";

type Props = { params: Promise<{ store: string }>; searchParams: Promise<{ category?: string }> };
export async function generateMetadata({ params: pendingParams }: Props): Promise<Metadata> {
  const params = await pendingParams;
  const page = await getPage(params.store, PRODUCTS_PAGE_SLUG);
  return { title: page?.title ?? "Shop" };
}

export default async function Catalog({ params: pendingParams, searchParams: pendingSearchParams }: Props) {
  const params = await pendingParams;
  const searchParams = await pendingSearchParams;
  const [store, page] = await Promise.all([getStore(params.store), getPage(params.store, PRODUCTS_PAGE_SLUG)]);
  if (!store) notFound();
  const sections = page?.sections ?? defaultCatalogSections();
  const products = await loadSectionProducts(store.slug, sections);
  const category = typeof searchParams.category === "string" ? searchParams.category : undefined;
  return <Sections sections={sections} ctx={{ store, products, preview: false, category }} />;
}
