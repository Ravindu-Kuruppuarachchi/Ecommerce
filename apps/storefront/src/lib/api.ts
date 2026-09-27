import { productQueries, type Section } from "@repo/core";
import type { Product, PublicStore, PublishedPage } from "./types";

// Server components can reach the API on an internal address; browsers use the public one.
export const API_URL =
  (typeof window === "undefined" && process.env.API_URL) || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/** Short cache so published changes show up within seconds without hammering the API. */
const REVALIDATE_SECONDS = 5;

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json();
}

export const getStore = (slug: string) => get<PublicStore>(`/stores/${encodeURIComponent(slug)}`);

export const getPage = (slug: string, page: string) =>
  get<PublishedPage>(`/stores/${encodeURIComponent(slug)}/pages/${encodeURIComponent(page)}`);

export async function getProducts(slug: string, query: { category?: string; limit?: number } = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.limit) params.set("limit", String(query.limit));
  return (await get<Product[]>(`/products/store/${encodeURIComponent(slug)}?${params}`)) ?? [];
}

export const getProduct = (slug: string, productSlug: string) =>
  get<{ product: Product; relatedProducts: Product[] }>(
    `/products/store/${encodeURIComponent(slug)}/${encodeURIComponent(productSlug)}`,
  );

/** Fetches every product list the sections need, in parallel. */
export async function loadSectionProducts(slug: string, sections: Section[]): Promise<Record<string, Product[]>> {
  const queries = productQueries(sections);
  const results = await Promise.all(queries.map((q) => getProducts(slug, { category: q.category, limit: q.limit })));
  return Object.fromEntries(queries.map((q, i) => [q.key, results[i]]));
}
