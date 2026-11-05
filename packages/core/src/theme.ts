import { isSafeContentUrl } from "./urls";
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

export const HEADER_STYLES = ["minimal", "standard", "premium", "contrast", "department"] as const;
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
  if (!link || !isSafeContentUrl(link)) return `/${storeSlug}`;
  if (/^https?:\/\//i.test(link)) return link;
  if (!link.startsWith("/")) return `/${storeSlug}`;
  return link === "/" ? `/${storeSlug}` : `/${storeSlug}${link}`;
}

// ---- Theme-wide settings (stored in StoreTheme.settings) ----

export const CORNER_STYLES = ["sharp", "soft", "round"] as const;
export const BUTTON_STYLES = ["solid", "outline"] as const;
export const IMAGE_RATIOS = ["portrait", "square", "landscape"] as const;

export interface NavigationLink { label: string; link: string }

export interface ThemeSettings {
  /** Optional curated department links. Older themes keep their page-based navigation. */
  navigation?: NavigationLink[];
  corners: (typeof CORNER_STYLES)[number];
  buttons: (typeof BUTTON_STYLES)[number];
  /** Shape of product images in grids and on product pages. */
  imageRatio: (typeof IMAGE_RATIOS)[number];
  /** Show an add-to-cart button on product cards, or keep cards to image, name and price. */
  quickAdd: boolean;
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = { corners: "soft", buttons: "solid", imageRatio: "portrait", quickAdd: true };

const pick = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

/** Fills in defaults and drops anything unknown, so old or hand-edited settings always render. */
export function normalizeThemeSettings(raw: unknown): ThemeSettings {
  const s = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const navigation = Array.isArray(s.navigation) ? s.navigation.slice(0, 8).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.label !== "string" || !item.label.trim() || typeof item.link !== "string" || !/^(\/(?!\/)|https?:\/\/)/i.test(item.link)) return [];
    return [{ label: item.label.trim().slice(0, 40), link: item.link.slice(0, 500) }];
  }) : [];
  return {
    ...(navigation.length ? { navigation } : {}),
    corners: pick(CORNER_STYLES, s.corners, DEFAULT_THEME_SETTINGS.corners),
    buttons: pick(BUTTON_STYLES, s.buttons, DEFAULT_THEME_SETTINGS.buttons),
    imageRatio: pick(IMAGE_RATIOS, s.imageRatio, DEFAULT_THEME_SETTINGS.imageRatio),
    quickAdd: typeof s.quickAdd === "boolean" ? s.quickAdd : DEFAULT_THEME_SETTINGS.quickAdd,
  };
}

/** Per-section colour scheme, chosen in the editor. */
export const SECTION_BACKGROUNDS = ["default", "subtle", "accent", "inverse"] as const;
export type SectionBackground = (typeof SECTION_BACKGROUNDS)[number];
