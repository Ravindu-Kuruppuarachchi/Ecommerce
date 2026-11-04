import { createSection, type Section } from "./sections";

// Reserved internal key cannot collide with merchant-created page addresses.
export const PRODUCTS_PAGE_SLUG = "__products";
export const pagePath = (slug: string) => slug === "home" ? "/" : slug === PRODUCTS_PAGE_SLUG ? "/products" : `/pages/${slug}`;
export const defaultCatalogSections = () => [createSection("product-catalog", {}, "catalog")];

export const PAGE_PRESETS = ["blank", "story", "contact", "category"] as const;
export type PagePreset = typeof PAGE_PRESETS[number];
export interface SitePage {
  slug: string; title: string; showInNavigation?: boolean; navigationPosition?: number;
  category?: string | null;
}

export function pagePresetSections(preset: PagePreset, { title, category, description, email, phone }: { title: string; category?: string; description?: string | null; email?: string | null; phone?: string | null }): Section[] {
  if (preset === "blank") return [];
  if (preset === "category") return [createSection("product-catalog", { heading: title, category: category || "", showCategories: false, showCount: true }, "category-catalog")];
  if (preset === "contact") return [createSection("rich-text", { heading: title, body: ["We'd love to hear from you.", email ? `Email: ${email}` : "Add your contact email here.", phone ? `Phone: ${phone}` : "Add your phone number and opening hours here."].join("\n\n") }, "contact")];
  return [createSection("rich-text", { heading: title, body: description || "Share how your store began, what matters to you and the people behind it." }, "story")];
}

export function catalogCategory(sections: unknown): string | null {
  if (!Array.isArray(sections)) return null;
  const catalog = sections.find(section => section?.type === "product-catalog");
  return typeof catalog?.props?.category === "string" && catalog.props.category.trim() ? catalog.props.category.trim() : null;
}

export const categoryPageSlug = (category: string) => `category-${category.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "collection"}`;

/** Navigation can only contain actual pages. No independent link list can become stale. */
export function pageNavigation(pages: readonly SitePage[]) {
  return pages.filter(page => page.showInNavigation ?? page.slug !== "home")
    .slice().sort((a, b) => (a.navigationPosition ?? 0) - (b.navigationPosition ?? 0))
    .map(page => ({ label: page.title, link: pagePath(page.slug), slug: page.slug }));
}

/** Preserve old category links while directing them to the editable category page when available. */
export function resolvePageLink(link: string, pages: readonly SitePage[]): string {
  if (!link.startsWith("/products?")) return link;
  const category = new URLSearchParams(link.slice(link.indexOf("?") + 1)).get("category");
  const page = category ? pages.find(page => page.category?.toLowerCase() === category.toLowerCase()) : undefined;
  return page ? pagePath(page.slug) : link;
}

export interface SectionButton { label: string; link: string; style: string }
/** Explicit empty buttons means none; legacy banners retain their original buttons. */
export function sectionButtons(props: Record<string, unknown>): SectionButton[] {
  if (Array.isArray(props.buttons)) return props.buttons.filter(button => button && typeof button === "object").map(button => ({ label: typeof button.label === "string" ? button.label : "", link: typeof button.link === "string" ? button.link : "", style: button.style === "secondary" ? "secondary" : "primary" }));
  return [
    ...(typeof props.ctaLabel === "string" && props.ctaLabel ? [{ label: props.ctaLabel, link: typeof props.ctaLink === "string" ? props.ctaLink : "/products", style: "primary" }] : []),
    ...(typeof props.secondaryCtaLabel === "string" && props.secondaryCtaLabel ? [{ label: props.secondaryCtaLabel, link: typeof props.secondaryCtaLink === "string" ? props.secondaryCtaLink : "/products", style: "secondary" }] : []),
  ];
}

/** Resolve removed custom-page destinations to the catalog instead of serving a dead link. */
export function livePageLink(link: string, pages: readonly SitePage[]): string {
  const resolved = resolvePageLink(link, pages);
  const path = resolved.split(/[?#]/, 1)[0];
  if (path.startsWith("/pages/") && !pages.some(page => pagePath(page.slug) === path)) return "/products";
  return resolved;
}
