import type { HeaderStyle, ProductOption, Section } from "@repo/core";

export interface StoreTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headerStyle: HeaderStyle;
  /** Raw JSON from the API; read it through themeSettings(). */
  settings: unknown;
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
  pages: Array<{ slug: string; title: string; showInNavigation?: boolean; navigationPosition?: number; category?: string | null }>;
  /** Optional modules the storefront needs to know about. */
  features: { shipping: boolean; discounts: boolean; analytics: boolean };
}

export interface ProductVariant {
  id: string;
  title: string;
  optionValues: Record<string, string>;
  /** Null means the product price. */
  priceCents: number | null;
  quantity: number;
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
  options: ProductOption[];
  variants: ProductVariant[];
}

export interface PublishedPage {
  slug: string;
  title: string;
  sections: Section[];
}

/** Everything a section needs besides its own props. */
export interface SectionContext {
  category?: string;
  store: PublicStore;
  /** Product lists keyed by productQueryFor(section).key. */
  products: Record<string, Product[]>;
  /** True inside the dashboard editor: empty sections show hints instead of disappearing. */
  preview: boolean;
}
