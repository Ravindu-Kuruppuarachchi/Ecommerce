import { isSafeContentUrl } from "./urls";
// Storefront pages are stored as an ordered list of sections. Each section
// type declares its editable fields; the builder renders a form from them and
// the API validates saved pages against them.

export type FieldDefinition =
  | { kind: "text"; name: string; label: string; maxLength?: number }
  | { kind: "textarea"; name: string; label: string; maxLength?: number }
  | { kind: "url"; name: string; label: string }
  | { kind: "image"; name: string; label: string }
  | { kind: "color"; name: string; label: string }
  | { kind: "number"; name: string; label: string; min: number; max: number }
  | { kind: "boolean"; name: string; label: string }
  | { kind: "select"; name: string; label: string; options: readonly string[] }
  /** Items the merchant can add, remove and reorder, each with its own fields. */
  | { kind: "list"; name: string; label: string; maxItems: number; fields: FieldDefinition[] };

export type SectionType =
  | "canvas"
  | "campaign-slider"
  | "link-strip"
  | "announcement"
  | "hero"
  | "product-catalog"
  | "featured-products"
  | "category-grid"
  | "image-with-text"
  | "rich-text"
  | "testimonials"
  | "newsletter"
  | "faq"
  | "selling-points"
  | "promo-tiles";

export interface SectionDefinition {
  type: SectionType;
  label: string;
  fields: FieldDefinition[];
  defaults: Record<string, unknown>;
}

export interface Section {
  id: string;
  type: SectionType;
  props: Record<string, unknown>;
}

/** Every section except the hero (which has its own image) can change its colour scheme. */
export const BACKGROUND_FIELD: FieldDefinition = {
  kind: "select",
  name: "background",
  label: "Colour scheme",
  options: ["default", "subtle", "accent", "inverse"],
};

const alignment: FieldDefinition = { kind: "select", name: "align", label: "Alignment", options: ["left", "center"] };
const BUTTONS_FIELD: FieldDefinition = { kind: "list", name: "buttons", label: "Buttons", maxItems: 4, fields: [
  { kind: "text", name: "label", label: "Button label", maxLength: 30 },
  { kind: "url", name: "link", label: "Page" },
  { kind: "select", name: "style", label: "Button style", options: ["primary", "secondary"] },
] };

export const CANVAS_FIELDS: FieldDefinition[] = [
  { kind: "number", name: "canvasHeight", label: "Canvas height (px)", min: 200, max: 1600 },
  { kind: "color", name: "canvasColor", label: "Canvas background" },
  { kind: "list", name: "elements", label: "Elements (last is on top)", maxItems: 30, fields: [
    { kind: "select", name: "kind", label: "Element", options: ["text", "button", "panel", "image"] },
    { kind: "textarea", name: "text", label: "Text", maxLength: 2000 },
    { kind: "url", name: "link", label: "Button destination" },
    { kind: "image", name: "image", label: "Image" },
    { kind: "select", name: "font", label: "Font", options: ["inherit", "Arial", "Georgia", "Verdana", "Courier New"] },
    { kind: "number", name: "fontSize", label: "Font size (px)", min: 8, max: 160 },
    { kind: "select", name: "weight", label: "Weight", options: ["400", "500", "600", "700", "800"] },
    { kind: "select", name: "align", label: "Text alignment", options: ["left", "center", "right"] },
    { kind: "color", name: "color", label: "Text colour" },
    { kind: "color", name: "fill", label: "Fill colour" },
    { kind: "number", name: "fillOpacity", label: "Fill opacity (%)", min: 0, max: 100 },
    { kind: "number", name: "opacity", label: "Element opacity (%)", min: 0, max: 100 },
    { kind: "number", name: "radius", label: "Corner radius (px)", min: 0, max: 200 },
    { kind: "number", name: "x", label: "Horizontal position (%)", min: 0, max: 99 },
    { kind: "number", name: "y", label: "Vertical position (%)", min: 0, max: 99 },
    { kind: "number", name: "width", label: "Width (%)", min: 1, max: 100 },
    { kind: "number", name: "height", label: "Height (%)", min: 1, max: 100 },
  ] },
];

export const SECTIONS: Record<SectionType, SectionDefinition> = {
  canvas: { type: "canvas", label: "Freeform canvas", fields: CANVAS_FIELDS, defaults: { canvasHeight: 600, canvasColor: "#fff3e8", elements: [] } },
  "campaign-slider": {
    type: "campaign-slider", label: "Campaign slideshow",
    fields: [
      { kind: "text", name: "label", label: "Accessible slideshow name", maxLength: 60 },
      { kind: "select", name: "layout", label: "Image layout", options: ["banner", "split"] },
      { kind: "select", name: "height", label: "Height", options: ["medium", "full"] },
      { kind: "list", name: "slides", label: "Campaigns", maxItems: 5, fields: [
        { kind: "text", name: "heading", label: "Heading", maxLength: 80 },
        { kind: "text", name: "eyebrow", label: "Small heading", maxLength: 50 },
        { kind: "textarea", name: "body", label: "Description", maxLength: 240 },
        { kind: "image", name: "image", label: "Campaign image" },
        { kind: "text", name: "imageAlt", label: "Image description", maxLength: 160 },
        { kind: "select", name: "imageFocus", label: "Image focal point", options: ["top", "center", "bottom"] },
        { kind: "text", name: "ctaLabel", label: "Button label", maxLength: 30 },
        { kind: "url", name: "ctaLink", label: "Button link" },
        BUTTONS_FIELD,
      ] },
    ],
    defaults: { label: "Latest collections", layout: "banner", height: "medium", slides: [] },
  },
  "link-strip": {
    type: "link-strip", label: "Collection shortcuts",
    fields: [
      { kind: "text", name: "heading", label: "Heading (optional)", maxLength: 60 },
      { kind: "list", name: "items", label: "Links", maxItems: 10, fields: [
        { kind: "text", name: "label", label: "Label", maxLength: 40 },
        { kind: "url", name: "link", label: "Destination" },
      ] },
      BACKGROUND_FIELD,
    ],
    defaults: { heading: "Explore the collection", items: [] },
  },
  announcement: {
    type: "announcement",
    label: "Announcement bar",
    fields: [
      { kind: "text", name: "text", label: "Message", maxLength: 120 },
      { kind: "url", name: "link", label: "Link" },
    ],
    defaults: { text: "Order online and pay cash on delivery", link: "" },
  },
  hero: {
    type: "hero",
    label: "Hero banner",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 80 },
      { kind: "text", name: "eyebrow", label: "Small heading (optional)", maxLength: 50 },
      { kind: "select", name: "layout", label: "Image layout", options: ["banner", "overlay", "split", "editorial", "poster", "duo", "spotlight", "mosaic", "panorama", "utility"] },
      { kind: "textarea", name: "subheading", label: "Subheading", maxLength: 240 },
      { kind: "image", name: "image", label: "Main image" },
      { kind: "text", name: "imageAlt", label: "Image description", maxLength: 160 },
      { kind: "select", name: "imageFocus", label: "Image focal point", options: ["top", "center", "bottom"] },
      { kind: "boolean", name: "showSecondaryImage", label: "Show optional small side image (spotlight or mosaic)" },
      { kind: "image", name: "secondaryImage", label: "Second image (dual, spotlight or mosaic)" },
      { kind: "text", name: "secondaryImageAlt", label: "Second image description", maxLength: 160 },
      { kind: "text", name: "secondaryCtaLabel", label: "Second button label", maxLength: 30 },
      { kind: "url", name: "secondaryCtaLink", label: "Second button link" },
      { kind: "text", name: "ctaLabel", label: "Button label", maxLength: 30 },
      { kind: "url", name: "ctaLink", label: "Button link" },
      alignment,
      BUTTONS_FIELD,
      { kind: "select", name: "height", label: "Height", options: ["compact", "medium", "full"] },
    ],
    defaults: {
      heading: "Shop our latest products",
      subheading: "Browse what's in stock and pay cash when your order arrives.",
      image: "",
      ctaLabel: "Shop now",
      ctaLink: "/products",
      align: "left",
      height: "medium",
      layout: "banner",
      showSecondaryImage: false,
      eyebrow: "",
      imageAlt: "",
    },
  },
  "product-catalog": {
    type: "product-catalog", label: "Product catalog",
    fields: [
      { kind: "text", name: "category", label: "Product category (leave empty for all products)", maxLength: 60 },
      { kind: "text", name: "heading", label: "Heading", maxLength: 80 },
      { kind: "textarea", name: "description", label: "Introduction", maxLength: 500 },
      { kind: "select", name: "columns", label: "Columns", options: ["2", "3", "4"] },
      { kind: "boolean", name: "showCategories", label: "Show category filters" },
      { kind: "boolean", name: "showCount", label: "Show product count" },
      { kind: "boolean", name: "showTools", label: "Show search, sorting and stock filters" },
      { kind: "select", name: "cardStyle", label: "Product card style", options: ["minimal", "framed"] },
      { kind: "select", name: "imageFit", label: "Product image fit", options: ["cover", "contain"] },
      BACKGROUND_FIELD,
    ],
    defaults: { heading: "All products", description: "", columns: "4", showCategories: true, showCount: false, showTools: true, cardStyle: "minimal", imageFit: "cover" },
  },
  "featured-products": {
    type: "featured-products",
    label: "Featured products",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 60 },
      { kind: "select", name: "layout", label: "Product layout", options: ["grid", "rail"] },
      { kind: "select", name: "cardStyle", label: "Product card style", options: ["minimal", "framed"] },
      { kind: "select", name: "imageFit", label: "Product image fit", options: ["cover", "contain"] },
      { kind: "select", name: "headingStyle", label: "Heading style", options: ["normal", "uppercase"] },
      { kind: "select", name: "source", label: "Show", options: ["newest", "category"] },
      { kind: "text", name: "category", label: "Category (when showing a category)", maxLength: 60 },
      { kind: "number", name: "limit", label: "Number of products", min: 2, max: 24 },
      { kind: "select", name: "columns", label: "Columns", options: ["2", "3", "4"] },
      BACKGROUND_FIELD,
      BUTTONS_FIELD,
    ],
    defaults: { heading: "Featured", source: "newest", category: "", limit: 8, columns: "4", buttons: [{ label: "Shop collection", link: "/products", style: "secondary" }] },
  },
  "category-grid": {
    type: "category-grid",
    label: "Category tiles",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 60 },
      { kind: "select", name: "layout", label: "Tile style", options: ["grid", "editorial", "compact", "overlay", "circles"] },
      {
        kind: "list",
        name: "items",
        label: "Tiles",
        maxItems: 8,
        fields: [
          { kind: "text", name: "label", label: "Label", maxLength: 40 },
          { kind: "text", name: "category", label: "Category", maxLength: 60 },
          { kind: "url", name: "link", label: "Page" },
          { kind: "image", name: "image", label: "Image" },
        ],
      },
      BACKGROUND_FIELD,
    ],
    defaults: { heading: "Shop by category", items: [] },
  },
  "image-with-text": {
    type: "image-with-text",
    label: "Image with text",
    fields: [
      { kind: "image", name: "image", label: "Image" },
      { kind: "text", name: "heading", label: "Heading", maxLength: 80 },
      { kind: "textarea", name: "body", label: "Text", maxLength: 1000 },
      { kind: "select", name: "imagePosition", label: "Image position", options: ["left", "right"] },
      BACKGROUND_FIELD,
    ],
    defaults: { image: "", heading: "Our story", body: "Tell customers who you are and what you make.", imagePosition: "left" },
  },
  "rich-text": {
    type: "rich-text",
    label: "Text block",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 80 },
      { kind: "textarea", name: "body", label: "Text", maxLength: 4000 },
      alignment,
      BACKGROUND_FIELD,
    ],
    defaults: { heading: "", body: "", align: "left" },
  },
  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 60 },
      {
        kind: "list",
        name: "items",
        label: "Quotes",
        maxItems: 6,
        fields: [
          { kind: "textarea", name: "quote", label: "Quote", maxLength: 400 },
          { kind: "text", name: "author", label: "Name", maxLength: 60 },
        ],
      },
      BACKGROUND_FIELD,
    ],
    defaults: { heading: "What customers say", items: [], background: "subtle" },
  },
  newsletter: {
    type: "newsletter",
    label: "Newsletter signup",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 60 },
      { kind: "textarea", name: "body", label: "Text", maxLength: 240 },
      BACKGROUND_FIELD,
    ],
    defaults: { heading: "Stay in the loop", body: "New drops and offers, straight to your inbox." },
  },
  faq: {
    type: "faq",
    label: "Questions and answers",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 60 },
      {
        kind: "list",
        name: "items",
        label: "Questions",
        maxItems: 12,
        fields: [
          { kind: "text", name: "question", label: "Question", maxLength: 160 },
          { kind: "textarea", name: "answer", label: "Answer", maxLength: 1200 },
        ],
      },
      BACKGROUND_FIELD,
    ],
    defaults: {
      heading: "Questions",
      items: [
        { question: "How do I pay?", answer: "Pay in cash to the courier when your order arrives." },
        { question: "How long does delivery take?", answer: "It depends on your district. You'll see the estimate at checkout." },
      ],
    },
  },
  "selling-points": {
    type: "selling-points",
    label: "Selling points",
    fields: [
      { kind: "text", name: "heading", label: "Heading (optional)", maxLength: 60 },
      {
        kind: "list",
        name: "items",
        label: "Points",
        maxItems: 4,
        fields: [
          { kind: "text", name: "title", label: "Title", maxLength: 40 },
          { kind: "textarea", name: "body", label: "Text", maxLength: 160 },
        ],
      },
      BACKGROUND_FIELD,
    ],
    defaults: {
      heading: "",
      items: [
        { title: "Cash on delivery", body: "Pay when your order reaches your door." },
        { title: "Delivered to your door", body: "Delivery cost and timing for your district are shown at checkout." },
      ],
    },
  },
  "promo-tiles": {
    type: "promo-tiles",
    label: "Promo tiles",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Tiles",
        maxItems: 3,
        fields: [
          { kind: "image", name: "image", label: "Image" },
          { kind: "text", name: "heading", label: "Heading", maxLength: 60 },
          { kind: "text", name: "linkLabel", label: "Link label", maxLength: 30 },
          { kind: "url", name: "link", label: "Link" },
        ],
      },
      BACKGROUND_FIELD,
    ],
    defaults: { items: [] },
  },
};

for (const definition of Object.values(SECTIONS)) {
  if (definition.type !== "canvas") definition.fields.push(CANVAS_FIELDS[2]);
}

export function isSectionType(value: unknown): value is SectionType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SECTIONS, value);
}

export function createSection(type: SectionType, props: Record<string, unknown> = {}, id?: string): Section {
  return {
    id: id ?? `${type}-${Math.random().toString(36).slice(2, 10)}`,
    type,
    props: { ...structuredClone(SECTIONS[type].defaults), ...props },
  };
}

export const MAX_SECTIONS_PER_PAGE = 40;

function validateField(field: FieldDefinition, value: unknown, path: string, errors: string[]): void {
  if (value === undefined || value === null || value === "") return; // every field is optional
  switch (field.kind) {
    case "text":
    case "textarea":
      if (typeof value !== "string") errors.push(`${path} must be text`);
      else if (field.maxLength && value.length > field.maxLength) errors.push(`${path} is longer than ${field.maxLength} characters`);
      return;
    case "url":
    case "image":
      // Relative store paths or http(s) only; blocks javascript: and data: URLs.
      if (typeof value !== "string" || !isSafeContentUrl(value)) errors.push(`${path} must be a link starting with / or https://`);
      return;
    case "color":
      if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) errors.push(`${path} must be a hex color like #1a2b3c`);
      return;
    case "number":
      if (typeof value !== "number" || !Number.isInteger(value) || value < field.min || value > field.max)
        errors.push(`${path} must be a whole number from ${field.min} to ${field.max}`);
      return;
    case "boolean":
      if (typeof value !== "boolean") errors.push(`${path} must be true or false`);
      return;
    case "select":
      if (typeof value !== "string" || !field.options.includes(value)) errors.push(`${path} must be one of ${field.options.join(", ")}`);
      return;
    case "list":
      if (!Array.isArray(value)) {
        errors.push(`${path} must be a list`);
        return;
      }
      if (value.length > field.maxItems) { errors.push(`${path} can have at most ${field.maxItems} items`); return; }
      value.forEach((item, i) => {
        if (typeof item !== "object" || item === null) {
          errors.push(`${path}[${i}] must be an object`);
          return;
        }
        for (const sub of field.fields) validateField(sub, (item as Record<string, unknown>)[sub.name], `${path} item ${i + 1}, ${sub.label}`, errors);
      });
      return;
  }
}

/** Strip unknown properties at every list level, including buttons and tiles. */
function cleanField(field: FieldDefinition, value: unknown): unknown {
  if (field.kind !== "list" || !Array.isArray(value)) return value;
  return value.slice(0, field.maxItems).map(item => {
    if (!item || typeof item !== "object") return item;
    return Object.fromEntries(field.fields.filter(child => Object.prototype.hasOwnProperty.call(item, child.name)).map(child => [child.name, cleanField(child, item[child.name])]));
  });
}

/**
 * Check an untrusted list of sections. Returns the sections with unknown
 * props stripped, or the list of problems found.
 */
export function validateSections(input: unknown): { ok: true; sections: Section[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(input)) return { ok: false, errors: ["sections must be a list"] };
  if (input.length > MAX_SECTIONS_PER_PAGE) return { ok: false, errors: [`a page can have at most ${MAX_SECTIONS_PER_PAGE} sections`] };

  const errors: string[] = [];
  const sections: Section[] = [];
  const ids = new Set<string>();

  input.forEach((raw, i) => {
    const s = raw as Partial<Section>;
    if (typeof s?.id !== "string" || !/^[\w-]{1,64}$/.test(s.id) || ids.has(s.id)) {
      errors.push(`sections[${i}].id must be a unique short identifier`);
      return;
    }
    ids.add(s.id);
    if (!isSectionType(s.type)) {
      errors.push(`sections[${i}].type "${String(s.type)}" is not a known section`);
      return;
    }
    const props = (typeof s.props === "object" && s.props) || {};
    const def = SECTIONS[s.type];
    const clean: Record<string, unknown> = {};
    for (const field of def.fields) {
      const value = (props as Record<string, unknown>)[field.name];
      // Messages name the section and field as the merchant sees them in the editor.
      validateField(field, value, `${def.label} (section ${i + 1}), ${field.label}`, errors);
      if (value !== undefined) clean[field.name] = cleanField(field, value);
    }
    sections.push({ id: s.id, type: s.type, props: clean });
  });

  return errors.length ? { ok: false, errors } : { ok: true, sections };
}

/** A product list a section needs from the catalog. */
export interface ProductQuery {
  key: string;
  category?: string;
  limit: number;
}

/**
 * Product lists the given sections need, deduplicated. Renderers fetch these
 * once per page and look results up by section via productQueryKey.
 */
export function productQueries(sections: Section[]): ProductQuery[] {
  const byKey = new Map<string, ProductQuery>();
  for (const section of sections) {
    const query = productQueryFor(section);
    if (query) byKey.set(query.key, query);
  }
  return [...byKey.values()];
}

export function productQueryFor(section: Section): ProductQuery | null {
  if (section.type === "product-catalog") {
    const category = typeof section.props.category === "string" ? section.props.category.trim() : "";
    return category ? { key: `catalog:category:${category}`, category, limit: 100 } : { key: "catalog:all", limit: 100 };
  }
  if (section.type !== "featured-products") return null;
  const props = { ...SECTIONS["featured-products"].defaults, ...section.props };
  const limit = typeof props.limit === "number" ? props.limit : 8;
  const category = props.source === "category" && typeof props.category === "string" ? props.category.trim() : "";
  return category ? { key: `category:${category}:${limit}`, category, limit } : { key: `newest:${limit}`, limit };
}
