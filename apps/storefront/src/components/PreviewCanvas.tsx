"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PRODUCTS_PAGE_SLUG, productQueries, validateSections, type Section } from "@repo/core";
import { loadSectionProducts } from "@/lib/api";
import type { Product, PublicStore } from "@/lib/types";
import Sections from "./sections/Sections";

// The dashboard origins allowed to drive the preview.
const DASHBOARD_ORIGINS = (process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3002")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""));

type Incoming =
  | { type: "builder:render"; sections: unknown; selectedId: string | null }
  | { type: "builder:scroll-to"; id: string };

export default function PreviewCanvas({ store }: { store: PublicStore }) {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [products, setProducts] = useState<Record<string, Product[]>>({});
  const parentOrigin = useRef<string | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent<Incoming>) => {
      if (!DASHBOARD_ORIGINS.includes(event.origin) || event.source !== window.parent) return;
      parentOrigin.current = event.origin;
      const msg = event.data;
      if (msg?.type === "builder:render") {
        const result = validateSections(msg.sections);
        if (result.ok) setSections(result.sections);
        setSelectedId(msg.selectedId);
      } else if (msg?.type === "builder:scroll-to") {
        document.querySelector(`[data-section-id="${CSS.escape(msg.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("message", onMessage);
    // Tell every allowed dashboard we're ready; only the real parent will answer.
    for (const origin of DASHBOARD_ORIGINS) window.parent.postMessage({ type: "builder:ready" }, origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (parentOrigin.current) window.parent.postMessage({ type: "builder:element-change", ...detail }, parentOrigin.current);
    };
    window.addEventListener("builder:element-change", changed);
    return () => window.removeEventListener("builder:element-change", changed);
  }, []);

  // Refetch product lists only when the set of queries changes, not on every keystroke.
  const queryKey = useMemo(() => (sections ? productQueries(sections).map((q) => q.key).sort().join("|") : ""), [sections]);
  useEffect(() => {
    if (!sections) return;
    let cancelled = false;
    loadSectionProducts(store.slug, sections).then((result) => !cancelled && setProducts(result)).catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, store.slug]);

  // Header/footer page links ask the editor to switch pages; section links remain selectable.
  useEffect(() => {
    const block = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;
      e.preventDefault();
      if (target.closest("[data-section-id]") || !parentOrigin.current) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const root = `/${store.slug}`;
      const slug = url.pathname === `${root}/products` ? PRODUCTS_PAGE_SLUG : url.pathname === root || url.pathname === `${root}/` ? "home" : url.pathname.startsWith(`${root}/pages/`) ? url.pathname.slice(`${root}/pages/`.length) : null;
      if (slug) window.parent.postMessage({ type: "builder:navigate", slug }, parentOrigin.current);
    };
    document.addEventListener("click", block, true);
    return () => document.removeEventListener("click", block, true);
  }, [store.slug]);

  const onClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, form")) e.preventDefault();
    const id = target.closest<HTMLElement>("[data-section-id]")?.dataset.sectionId;
    if (id && parentOrigin.current) window.parent.postMessage({ type: "builder:select", id }, parentOrigin.current);
  };

  if (!sections) {
    return <div className="mx-auto store-content animate-pulse px-4 py-16 sm:px-8"><div className="h-[50dvh] rounded-media bg-store-surface" /></div>;
  }

  return (
    <div onClickCapture={onClick}>
      {sections.length === 0 ? (
        <p className="mx-auto max-w-xl px-4 py-24 text-center text-store-muted">This page is empty. Add a section from the editor.</p>
      ) : (
        <Sections sections={sections} ctx={{ store, products, preview: true }} selectedId={selectedId} />
      )}
    </div>
  );
}
