import type { HeaderStyle, Section } from "@repo/core";

export interface StoreTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headerStyle: HeaderStyle;
}

export interface PublicStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  currency: string;
  taxBps: number;
  status: "draft" | "live" | "suspended";
  theme: StoreTheme | null;
  pages: Array<{ slug: string; title: string }>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  quantity: number;
  category: string | null;
  images: Array<{ url: string; alt: string | null }>;
}

export interface PublishedPage {
  slug: string;
  title: string;
  sections: Section[];
}

/** Everything a section needs besides its own props. */
export interface SectionContext {
  store: PublicStore;
  /** Product lists keyed by productQueryFor(section).key. */
  products: Record<string, Product[]>;
  /** True inside the dashboard editor: empty sections show hints instead of disappearing. */
  preview: boolean;
}
