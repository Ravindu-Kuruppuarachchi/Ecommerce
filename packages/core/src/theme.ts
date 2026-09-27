// Storefront theme helpers shared by the dashboard (editing) and the
// storefront (rendering).

/** Fonts the storefront bundles. Merchants can only pick from this list. */
export const FONT_OPTIONS = [
  { name: "Manrope", kind: "sans" },
  { name: "DM Sans", kind: "sans" },
  { name: "Outfit", kind: "sans" },
  { name: "Inter", kind: "sans" },
  { name: "Playfair Display", kind: "serif" },
  { name: "Cormorant Garamond", kind: "serif" },
] as const;

export type FontName = (typeof FONT_OPTIONS)[number]["name"];

export function isFontName(value: unknown): value is FontName {
  return FONT_OPTIONS.some((f) => f.name === value);
}

export const HEADER_STYLES = ["minimal", "standard", "premium"] as const;
export type HeaderStyle = (typeof HEADER_STYLES)[number];

function channel(hex: string, start: number): number {
  const c = parseInt(hex.slice(start, start + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb color. */
export function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Near-white or near-black, whichever reads better on the given background. */
export function readableTextOn(background: string): string {
  const light = "#fafafa";
  const dark = "#18181b";
  return contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark;
}

/**
 * Turns a link from page content into a storefront URL. Store-relative paths
 * ("/products") get the store prefix; absolute http(s) links pass through.
 */
export function storeHref(storeSlug: string, link: string | undefined | null): string {
  if (!link) return `/${storeSlug}`;
  if (/^https?:\/\//i.test(link)) return link;
  if (!link.startsWith("/")) return `/${storeSlug}`;
  return link === "/" ? `/${storeSlug}` : `/${storeSlug}${link}`;
}
