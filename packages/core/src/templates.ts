// Starter templates. A template is a theme (colors, fonts, header style) plus
// a starting set of pages. Applying one copies these into the store, after
// which the merchant owns and edits their copy.

import { createSection, type Section } from "./sections";
import type { FontName, HeaderStyle, ThemeSettings } from "./theme";

export type TemplateKey = "classic" | "boutique" | "bazaar" | "studio" | "market" | "noir";

export interface ThemeTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: FontName;
  headerStyle: HeaderStyle;
  settings: ThemeSettings;
}

export interface TemplatePage {
  slug: string;
  title: string;
  sections: Section[];
}

export interface TemplateDefinition {
  key: TemplateKey;
  name: string;
  description: string;
  bestFor: string;
  theme: ThemeTokens;
  pages: TemplatePage[];
}

/** Slug of the page served at the store root. */
export const HOME_PAGE_SLUG = "home";

// Section ids are fixed so a template's pages are identical every time it's applied.
export const TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  classic: {
    key: "classic",
    name: "Classic",
    description: "Clean layout with a bold hero and a straightforward product grid.",
    bestFor: "General stores and first-time sellers",
    theme: { primaryColor: "#18181b", secondaryColor: "#fafafa", accentColor: "#0f766e", fontFamily: "Manrope", headerStyle: "standard", settings: { corners: "soft", buttons: "solid", imageRatio: "portrait", quickAdd: true } },
    pages: [
      {
        slug: HOME_PAGE_SLUG,
        title: "Home",
        sections: [
          createSection("hero", {}, "hero"),
          createSection("featured-products", { heading: "New arrivals" }, "featured"),
          createSection("image-with-text", {}, "story"),
          createSection("newsletter", {}, "newsletter"),
        ],
      },
      {
        slug: "about",
        title: "About us",
        sections: [createSection("rich-text", { heading: "About us", body: "Share your story here." }, "about")],
      },
    ],
  },
  boutique: {
    key: "boutique",
    name: "Boutique",
    description: "Editorial, image-led layout with generous spacing and a serif display face.",
    bestFor: "Fashion, jewellery, handmade and lifestyle brands",
    theme: { primaryColor: "#1d2b24", secondaryColor: "#f4f5f2", accentColor: "#c2410c", fontFamily: "Playfair Display", headerStyle: "premium", settings: { corners: "sharp", buttons: "outline", imageRatio: "portrait", quickAdd: false } },
    pages: [
      {
        slug: HOME_PAGE_SLUG,
        title: "Home",
        sections: [
          createSection("hero", { heading: "Made slowly, worn for years", align: "center", height: "full", ctaLabel: "Explore the collection" }, "hero"),
          createSection("category-grid", { heading: "Collections" }, "collections"),
          createSection("featured-products", { heading: "The edit", limit: 6, columns: "3" }, "featured"),
          createSection("testimonials", {}, "testimonials"),
        ],
      },
      {
        slug: "about",
        title: "Our story",
        sections: [createSection("image-with-text", { heading: "Our story", imagePosition: "right" }, "story")],
      },
    ],
  },
  bazaar: {
    key: "bazaar",
    name: "Bazaar",
    description: "Dense, promotion-friendly layout that puts lots of products on screen.",
    bestFor: "Electronics, groceries and large catalogs",
    theme: { primaryColor: "#0f172a", secondaryColor: "#f8fafc", accentColor: "#1d4ed8", fontFamily: "DM Sans", headerStyle: "minimal", settings: { corners: "soft", buttons: "solid", imageRatio: "square", quickAdd: true } },
    pages: [
      {
        slug: HOME_PAGE_SLUG,
        title: "Home",
        sections: [
          createSection("announcement", {}, "announcement"),
          createSection("hero", { heading: "Everything in one place", height: "compact" }, "hero"),
          createSection("category-grid", { heading: "Shop by department" }, "departments"),
          createSection("featured-products", { heading: "Best sellers", limit: 12, columns: "4" }, "best-sellers"),
        ],
      },
    ],
  },
  studio: {
    key: "studio",
    name: "Studio",
    description: "Stark black and white with sharp edges and plenty of space. Lets product photos do the work.",
    bestFor: "Design objects, art prints, ceramics and small-batch makers",
    theme: { primaryColor: "#0a0a0a", secondaryColor: "#fafafa", accentColor: "#0a0a0a", fontFamily: "Outfit", headerStyle: "minimal", settings: { corners: "sharp", buttons: "solid", imageRatio: "square", quickAdd: false } },
    pages: [
      {
        slug: HOME_PAGE_SLUG,
        title: "Home",
        sections: [
          createSection("hero", { heading: "Objects for everyday use", height: "medium", ctaLabel: "View all" }, "hero"),
          createSection("featured-products", { heading: "Latest", limit: 6, columns: "3" }, "featured"),
          createSection("selling-points", { background: "subtle" }, "points"),
          createSection("rich-text", { heading: "About the studio", body: "Tell customers who makes your products and how." }, "about"),
        ],
      },
    ],
  },
  market: {
    key: "market",
    name: "Market",
    description: "Friendly and bright, with rounded shapes, promo tiles and quick add-to-cart buttons.",
    bestFor: "Groceries, spices, tea, home essentials and repeat purchases",
    theme: { primaryColor: "#14261a", secondaryColor: "#f6f8f4", accentColor: "#15803d", fontFamily: "Manrope", headerStyle: "standard", settings: { corners: "round", buttons: "solid", imageRatio: "square", quickAdd: true } },
    pages: [
      {
        slug: HOME_PAGE_SLUG,
        title: "Home",
        sections: [
          createSection("announcement", {}, "announcement"),
          createSection("hero", { heading: "Stock up on the essentials", height: "compact" }, "hero"),
          createSection("promo-tiles", {}, "promos"),
          createSection("featured-products", { heading: "Popular right now", limit: 8, columns: "4" }, "popular"),
          createSection("selling-points", { background: "subtle" }, "points"),
          createSection("faq", {}, "faq"),
        ],
      },
    ],
  },
  noir: {
    key: "noir",
    name: "Noir",
    description: "Dark background, bright accent and large imagery. A dramatic, after-hours feel.",
    bestFor: "Streetwear, beauty, tech accessories and nightlife brands",
    theme: { primaryColor: "#f4f4f5", secondaryColor: "#111113", accentColor: "#f43f5e", fontFamily: "Outfit", headerStyle: "premium", settings: { corners: "sharp", buttons: "solid", imageRatio: "portrait", quickAdd: false } },
    pages: [
      {
        slug: HOME_PAGE_SLUG,
        title: "Home",
        sections: [
          createSection("hero", { heading: "The new drop is here", height: "full", align: "left", ctaLabel: "Shop the drop" }, "hero"),
          createSection("featured-products", { heading: "Just landed", limit: 8, columns: "4" }, "featured"),
          createSection("image-with-text", { heading: "Made to stand out", imagePosition: "right", background: "subtle" }, "story"),
          createSection("newsletter", { heading: "Get first access" }, "newsletter"),
        ],
      },
    ],
  },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[];

export function isTemplateKey(value: unknown): value is TemplateKey {
  return typeof value === "string" && value in TEMPLATES;
}
