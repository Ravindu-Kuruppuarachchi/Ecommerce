import { pageNavigation, storeHref } from "@repo/core";
import type { PublicStore } from "./types";

/** Curated collection links (or Shop), followed by published pages except home. */
export function storeNavLinks(store: PublicStore) {
  return pageNavigation(store.pages).map(page => ({ href: storeHref(store.slug, page.link), label: page.label }));
}
