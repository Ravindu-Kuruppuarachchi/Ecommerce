import type { Metadata } from "next";
import { PRODUCTS_PAGE_SLUG } from "@repo/core";
import { notFound, redirect } from "next/navigation";
import Sections from "@/components/sections/Sections";
import { getPage, getStore, loadSectionProducts } from "@/lib/api";

type Params = { params: Promise<{ store: string; page: string }> };

export async function generateMetadata({ params: pendingParams }: Params): Promise<Metadata> {
  const params = await pendingParams;
  const page = await getPage(params.store, params.page);
  return page ? { title: page.title } : {};
}

export default async function StorePage({ params: pendingParams }: Params) {
  const params = await pendingParams;
  if (params.page === PRODUCTS_PAGE_SLUG) redirect(`/${params.store}/products`);
  const [store, page] = await Promise.all([getStore(params.store), getPage(params.store, params.page)]);
  if (!store || !page) notFound();
  const products = await loadSectionProducts(store.slug, page.sections);
  return <Sections sections={page.sections} ctx={{ store, products, preview: false }} />;
}
