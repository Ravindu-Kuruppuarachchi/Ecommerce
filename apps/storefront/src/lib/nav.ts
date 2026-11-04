import { HOME_PAGE_SLUG } from "@repo/core";
import type { PublicStore } from "./types";

/** Header and footer links: the catalog plus every published page except home. */
export function storeNavLinks(store: PublicStore) {
  return [
    { href: `/${store.slug}/products`, label: "Shop" },
    ...store.pages.filter((p) => p.slug !== HOME_PAGE_SLUG).map((p) => ({ href: `/${store.slug}/pages/${p.slug}`, label: p.title })),
  ];
}
