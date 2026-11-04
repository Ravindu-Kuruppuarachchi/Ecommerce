import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Sections from "@/components/sections/Sections";
import { getPage, getStore, loadSectionProducts } from "@/lib/api";

type Params = { params: { store: string; page: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await getPage(params.store, params.page);
  return page ? { title: page.title } : {};
}

export default async function StorePage({ params }: Params) {
  const [store, page] = await Promise.all([getStore(params.store), getPage(params.store, params.page)]);
  if (!store || !page) notFound();
  const products = await loadSectionProducts(store.slug, page.sections);
  return <Sections sections={page.sections} ctx={{ store, products, preview: false }} />;
}
