"use client";

import { pagePath, resolvePageLink } from "@repo/core";
import { createContext, useContext, useId } from "react";

export interface EditorPage { slug: string; title: string; publishedAt: string | null; showInNavigation?: boolean; navigationPosition?: number; category?: string | null }
export const PageLinksContext = createContext<EditorPage[]>([]);
export const pageDestination = pagePath;

/** Store-relative destinations work on every tenant domain. */
export function LinkDestination({ value, onChange, label, id: suppliedId }: { value: string; onChange: (value: string) => void; label: string; id?: string }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const pages = useContext(PageLinksContext);
  const destinations = [...pages.map(p => ({ value: pageDestination(p.slug), label: `${p.title}${p.publishedAt ? "" : " (draft)"}` })), { value: "/account", label: "Customer account" }];
  const resolved = resolvePageLink(value, pages);
  const matched = destinations.some(d => d.value === resolved);
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
    <select id={id} className="input-field" value={matched ? resolved : value ? "legacy" : ""} onChange={e => onChange(e.target.value)}>
      <option value="">No page selected</option>
      {!matched && value && <option value="legacy" disabled>Previous link — choose a page</option>}
      {destinations.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
    </select>
    {pages.some(p => pageDestination(p.slug) === value && !p.publishedAt) && <p className="text-xs text-amber-700">Publish this destination page before customers follow this link.</p>}
  </div>;
}
