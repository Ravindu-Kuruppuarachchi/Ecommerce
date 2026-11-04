"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Trash } from "@phosphor-icons/react";
import { PRODUCTS_PAGE_SLUG, type PagePreset } from "@repo/core";
import { pageApi, productApi, errorMessage } from "@/lib/api-client";
import { pageDestination, type EditorPage } from "./PageLinks";

export default function StorePagesPanel({ pages, currentSlug, onOpen, onRefresh, beforeCreate }: {
  pages: EditorPage[]; currentSlug: string;
  onOpen: (slug: string) => Promise<void>; onRefresh: () => Promise<void>; beforeCreate: () => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [preset, setPreset] = useState<PagePreset>("blank");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [inMenu, setInMenu] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<{ slug: string; value: boolean } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    productApi.list().then(response => { if (active) setCategories([...new Set<string>(response.data.map((product: { category: string | null }) => product.category).filter(Boolean))].sort()); }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!(await beforeCreate())) return;
      const created = await pageApi.create(title.trim(), address.trim() || undefined, { preset, category: category.trim() || undefined, showInNavigation: inMenu });
      await onRefresh();
      await onOpen(created.data.slug);
    } catch (error) { setError(errorMessage(error, "Couldn't create the page")); }
    finally { setBusy(false); }
  }
  async function toggle(page: EditorPage, checked: boolean) {
    setBusy(true); setError("");
    setPendingVisibility({ slug: page.slug, value: checked });
    try { await pageApi.setNavigation(page.slug, checked); await onRefresh(); }
    catch (error) { setError(errorMessage(error, "Couldn't update navigation")); }
    finally { setPendingVisibility(null); setBusy(false); }
  }
  async function move(index: number, offset: number) {
    const ordered = pages.map(page => page.slug);
    [ordered[index], ordered[index + offset]] = [ordered[index + offset], ordered[index]];
    setBusy(true); setError("");
    try { await pageApi.reorder(ordered); await onRefresh(); }
    catch (error) { setError(errorMessage(error, "Couldn't reorder pages")); }
    finally { setBusy(false); }
  }
  async function removePage(page: EditorPage) {
    if (["home", PRODUCTS_PAGE_SLUG].includes(page.slug) || page.slug === currentSlug || busy) return;
    if (!window.confirm(`Delete "${page.title}"? Buttons or tiles linked to it will need a new destination.`)) return;
    setBusy(true); setError("");
    try { await pageApi.delete(page.slug); await onRefresh(); }
    catch (error) { setError(errorMessage(error, "Couldn't delete the page")); }
    finally { setBusy(false); }
  }

  return <div className="flex-1 overflow-y-auto p-4">
    <h2 className="font-semibold">Pages & navigation</h2>
    <p className="mt-1 text-xs leading-relaxed text-gray-500">Your menu follows these pages. Choose which published pages appear and use the arrows to change their order. Switching pages saves your draft.</p>
    {error && <p role="alert" className="my-3 text-sm text-red-600">{error}</p>}
    <ul className="my-4 space-y-3">
      {pages.map((page, index) => <li key={page.slug} className={`rounded-lg border p-3 ${page.slug === currentSlug ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}>
        <div className="flex items-start gap-2">
          <button type="button" onClick={() => onOpen(page.slug)} aria-current={page.slug === currentSlug ? "page" : undefined} className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-medium">{page.title}</span><span className="mt-1 block break-all text-xs text-gray-500">{pageDestination(page.slug)} · {page.publishedAt ? "Published" : "Draft"}</span>
          </button>
          <div className="flex shrink-0 gap-1">
            <button type="button" aria-label={`Move ${page.title} up`} disabled={busy || index === 0} onClick={() => move(index, -1)} className="rounded p-1 text-gray-500 disabled:opacity-25"><ArrowUp size={14} /></button>
            <button type="button" aria-label={`Move ${page.title} down`} disabled={busy || index === pages.length - 1} onClick={() => move(index, 1)} className="rounded p-1 text-gray-500 disabled:opacity-25"><ArrowDown size={14} /></button>
            {!["home", PRODUCTS_PAGE_SLUG].includes(page.slug) && <button type="button" disabled={busy || page.slug === currentSlug} onClick={() => removePage(page)} aria-label={`Delete ${page.title}`} title={page.slug === currentSlug ? "Open another page before deleting this one" : `Delete ${page.title}`} className="rounded p-1 text-gray-500 hover:text-red-600 disabled:opacity-25"><Trash size={14} /></button>}
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" disabled={busy} aria-label={`Show ${page.title} in navigation`} checked={pendingVisibility?.slug === page.slug ? pendingVisibility.value : page.showInNavigation ?? page.slug !== "home"} onChange={event => toggle(page, event.target.checked)} />Show in navigation{!page.publishedAt && " after publishing"}</label>
      </li>)}
    </ul>
    <p className="mb-4 text-xs text-gray-500">Home and Products are core pages. You can hide them from navigation; other pages can also be deleted.</p>
    <form onSubmit={create} className="space-y-3 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-semibold">Add a page</h3>
      <div><label className="mb-1 block text-xs text-gray-600" htmlFor="page-preset">Start with</label>
        <select id="page-preset" value={preset} onChange={event => { const value = event.target.value as PagePreset; setPreset(value); if (!title) setTitle(value === "story" ? "Our story" : value === "contact" ? "Contact us" : ""); }} className="input-field">
          <option value="blank">Blank page</option><option value="story">Our story</option><option value="contact">Contact page</option><option value="category">Product category</option>
        </select>
      </div>
      {preset === "category" && <div><label className="mb-1 block text-xs text-gray-600" htmlFor="page-category">Product category</label><input id="page-category" list="page-categories" required maxLength={60} value={category} onChange={event => { setCategory(event.target.value); if (!title || title === category) setTitle(event.target.value); }} className="input-field" placeholder="Choose or enter a category" /><datalist id="page-categories">{categories.map(category => <option key={category} value={category} />)}</datalist><p className="mt-1 text-xs text-gray-500">Only products from this category appear on the page.</p></div>}
      <div><label className="mb-1 block text-xs text-gray-600" htmlFor="create-page-title">Page name</label><input id="create-page-title" required maxLength={80} value={title} onChange={event => setTitle(event.target.value)} className="input-field" placeholder="Delivery information" /></div>
      <details className="text-xs text-gray-600"><summary className="cursor-pointer">Customize page address</summary><label className="mb-1 mt-3 block" htmlFor="create-page-address">Page address</label><input id="create-page-address" maxLength={60} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={address} onChange={event => setAddress(event.target.value)} className="input-field" placeholder="Created from your page name" /></details>
      <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={inMenu} onChange={event => setInMenu(event.target.checked)} />Add to navigation when published</label>
      <button disabled={busy} className="btn-primary w-full">{busy ? "Creating…" : "Create page"}</button>
    </form>
    <p className="mt-5 text-xs leading-relaxed text-gray-500">To connect a button or tile, select its section and choose a page from its destination dropdown.</p>
  </div>;
}
