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
  | "announcement"
  | "hero"
  | "featured-products"
  | "category-grid"
  | "image-with-text"
  | "rich-text"
  | "testimonials"
  | "newsletter";

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

const alignment: FieldDefinition = { kind: "select", name: "align", label: "Alignment", options: ["left", "center"] };

export const SECTIONS: Record<SectionType, SectionDefinition> = {
  announcement: {
    type: "announcement",
    label: "Announcement bar",
    fields: [
      { kind: "text", name: "text", label: "Message", maxLength: 120 },
      { kind: "url", name: "link", label: "Link" },
    ],
    defaults: { text: "Island-wide delivery on orders over Rs 5,000", link: "" },
  },
  hero: {
    type: "hero",
    label: "Hero banner",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 80 },
      { kind: "textarea", name: "subheading", label: "Subheading", maxLength: 240 },
      { kind: "image", name: "image", label: "Background image" },
      { kind: "text", name: "ctaLabel", label: "Button label", maxLength: 30 },
      { kind: "url", name: "ctaLink", label: "Button link" },
      alignment,
      { kind: "select", name: "height", label: "Height", options: ["compact", "medium", "full"] },
    ],
    defaults: {
      heading: "New season, new arrivals",
      subheading: "Discover pieces picked for the way you live.",
      image: "",
      ctaLabel: "Shop now",
      ctaLink: "/products",
      align: "left",
      height: "medium",
    },
  },
  "featured-products": {
    type: "featured-products",
    label: "Featured products",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 60 },
      { kind: "select", name: "source", label: "Show", options: ["newest", "category"] },
      { kind: "text", name: "category", label: "Category (when showing a category)", maxLength: 60 },
      { kind: "number", name: "limit", label: "Number of products", min: 2, max: 24 },
      { kind: "select", name: "columns", label: "Columns", options: ["2", "3", "4"] },
    ],
    defaults: { heading: "Featured", source: "newest", category: "", limit: 8, columns: "4" },
  },
  "category-grid": {
    type: "category-grid",
    label: "Category tiles",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 60 },
      {
        kind: "list",
        name: "items",
        label: "Tiles",
        maxItems: 8,
        fields: [
          { kind: "text", name: "label", label: "Label", maxLength: 40 },
          { kind: "text", name: "category", label: "Category", maxLength: 60 },
          { kind: "image", name: "image", label: "Image" },
        ],
      },
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
    ],
    defaults: { heading: "What customers say", items: [] },
  },
  newsletter: {
    type: "newsletter",
    label: "Newsletter signup",
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 60 },
      { kind: "textarea", name: "body", label: "Text", maxLength: 240 },
    ],
    defaults: { heading: "Stay in the loop", body: "New drops and offers, straight to your inbox." },
  },
};

export function isSectionType(value: unknown): value is SectionType {
  return typeof value === "string" && value in SECTIONS;
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
      if (typeof value !== "string" || !/^(\/(?!\/)|https?:\/\/)/i.test(value)) errors.push(`${path} must be a link starting with / or https://`);
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
      if (value.length > field.maxItems) errors.push(`${path} can have at most ${field.maxItems} items`);
      value.forEach((item, i) => {
        if (typeof item !== "object" || item === null) {
          errors.push(`${path}[${i}] must be an object`);
          return;
        }
        for (const sub of field.fields) validateField(sub, (item as Record<string, unknown>)[sub.name], `${path}[${i}].${sub.name}`, errors);
      });
      return;
  }
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
      validateField(field, value, `sections[${i}].${field.name}`, errors);
      if (value !== undefined) clean[field.name] = value;
    }
    sections.push({ id: s.id, type: s.type, props: clean });
  });

  return errors.length ? { ok: false, errors } : { ok: true, sections };
}
