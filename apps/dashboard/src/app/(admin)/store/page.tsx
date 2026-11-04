"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowSquareOut, CheckCircle, Palette, SquaresFour, Warning } from "@phosphor-icons/react";
import { contrastRatio, isTemplateKey, FONT_OPTIONS, HEADER_STYLES, normalizeThemeSettings, SHOP_TYPES, TEMPLATE_KEYS, TEMPLATES, type TemplateKey, type ThemeSettings } from "@repo/core";
import { errorMessage, storeApi } from "@/lib/api-client";
import TemplateThumbnail from "@/components/TemplateThumbnail";
import { STOREFRONT_URL, storefrontUrl } from "@/lib/urls";
import { useAuthStore } from "@/stores/auth-store";

interface Theme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headerStyle: string;
  settings: unknown;
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const SETTING_CHOICES = {
  corners: { label: "Corners", options: [["sharp", "Sharp"], ["soft", "Soft"], ["round", "Round"]] },
  buttons: { label: "Buttons", options: [["solid", "Filled"], ["outline", "Outline"]] },
  imageRatio: { label: "Product image shape", options: [["portrait", "Portrait"], ["square", "Square"], ["landscape", "Landscape"]] },
} as const;

function ThemeCard({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState(initial);
  const [settings, setSettings] = useState<ThemeSettings>(normalizeThemeSettings(initial.settings));
  useEffect(() => setSettings(normalizeThemeSettings(initial.settings)), [initial]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => setTheme(initial), [initial]);

  const textContrast = contrastRatio(theme.primaryColor, theme.secondaryColor);
  const set = (key: keyof Theme) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTheme({ ...theme, [key]: e.target.value });
    setMessage(null);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { settings: _raw, ...tokens } = theme;
      await storeApi.updateTheme({ ...tokens, settings });
      setMessage({ ok: true, text: "Theme saved." });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err, "Couldn't save the theme") });
    } finally {
      setSaving(false);
    }
  };

  const colors: Array<{ key: "primaryColor" | "secondaryColor" | "accentColor"; label: string }> = [
    { key: "secondaryColor", label: "Background" },
    { key: "primaryColor", label: "Text" },
    { key: "accentColor", label: "Buttons and highlights" },
  ];

  return (
    <Card title="Theme" description="Colours and fonts apply to every page of your store.">
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {colors.map(({ key, label }) => (
            <div key={key}>
              <label htmlFor={`theme-${key}`} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
              <div className="flex gap-2">
                <input type="color" aria-label={`${label} picker`} value={theme[key]} onChange={set(key)} className="h-10 w-12 shrink-0 rounded-md border border-gray-300" />
                <input id={`theme-${key}`} value={theme[key]} onChange={set(key)} pattern="#[0-9a-fA-F]{6}" className="input-field font-mono" />
              </div>
            </div>
          ))}
        </div>
        {textContrast < 4.5 && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Warning size={18} className="mt-0.5 shrink-0" />
            Text may be hard to read on this background (contrast {textContrast.toFixed(1)}:1, aim for at least 4.5:1).
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="theme-font" className="mb-1.5 block text-sm font-medium text-gray-700">Font</label>
            <select id="theme-font" value={theme.fontFamily} onChange={set("fontFamily")} className="input-field">
              {FONT_OPTIONS.map((f) => (
                <option key={f.name} value={f.name}>{f.name}{f.kind === "serif" ? " (serif headings)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="theme-header" className="mb-1.5 block text-sm font-medium text-gray-700">Header style</label>
            <select id="theme-header" value={theme.headerStyle} onChange={set("headerStyle")} className="input-field">
              {HEADER_STYLES.map((h) => (
                <option key={h} value={h}>{h === "premium" ? "Centred name" : h === "minimal" ? "Compact" : h === "contrast" ? "Contrast masthead" : h === "department" ? "Department store" : "Standard"}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(SETTING_CHOICES) as Array<keyof typeof SETTING_CHOICES>).map((key) => (
            <fieldset key={key}>
              <legend className="mb-1.5 block text-sm font-medium text-gray-700">{SETTING_CHOICES[key].label}</legend>
              <div className="flex rounded-lg border border-gray-200 p-0.5">
                {SETTING_CHOICES[key].options.map(([value, text]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={settings[key] === value}
                    onClick={() => { setSettings({ ...settings, [key]: value }); setMessage(null); }}
                    className={`flex-1 rounded-md px-2 py-1.5 text-sm ${settings[key] === value ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.quickAdd}
            onChange={(e) => { setSettings({ ...settings, quickAdd: e.target.checked }); setMessage(null); }}
            className="h-4 w-4 rounded border-gray-300"
          />
          Show an &ldquo;Add to cart&rdquo; button on product cards
        </label>
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          Your header follows the pages in your store. <Link href="/store/pages/home" className="font-medium text-brand-700 underline underline-offset-4">Manage pages and navigation</Link>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save theme"}</button>
          {message && <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`} role="status">{message.text}</p>}
        </div>
      </form>
    </Card>
  );
}

function TemplatesCard({ current, onApplied }: { current: string; onApplied: () => void }) {
  const [filter, setFilter] = useState("All styles");
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("All shop types");
  const [confirming, setConfirming] = useState<TemplateKey | null>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (confirming) {
      confirmation.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      confirmation.current?.focus({ preventScroll: true });
    }
  }, [confirming]);
  const [replacePages, setReplacePages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const apply = async () => {
    if (!confirming) return;
    setBusy(true);
    setError("");
    try {
      await storeApi.applyTemplate(confirming, replacePages);
      setConfirming(null);
      onApplied();
    } catch (err) {
      setError(errorMessage(err, "Couldn't apply the template"));
    } finally {
      setBusy(false);
    }
  };

  const visibleTemplates = TEMPLATE_KEYS.filter((key) => {
    const t = TEMPLATES[key];
    return (filter === "All styles" || t.style === filter)
      && (industry === "All shop types" || t.industry === industry)
      && `${t.name} ${t.industry} ${t.bestFor} ${t.description}`.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <Card title="Templates" description="Switching template changes your theme. Your pages stay as they are unless you choose to replace them.">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter templates by style">
          {["All styles", "Minimal", "Editorial", "Bold", "Natural", "Sport", "Retail"].map((style) => <button key={style} type="button" aria-pressed={filter === style} onClick={() => setFilter(style)} className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${filter === style ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{style}</button>)}
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <select aria-label="Shop type" value={industry} onChange={(e) => setIndustry(e.target.value)} className="input-field sm:!w-52">
            <option>All shop types</option>
            {SHOP_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
          <input type="search" aria-label="Search templates" placeholder="Search by name or business…" value={query} onChange={(e) => setQuery(e.target.value)} className="input-field sm:!w-64" />
        </div>
      </div>
      <p className="mb-4 text-xs text-gray-500" role="status">{visibleTemplates.length} {visibleTemplates.length === 1 ? "design" : "designs"}{industry !== "All shop types" ? ` for ${industry.toLowerCase()}` : " to make your own"}</p>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visibleTemplates.map((key) => {
          const t = TEMPLATES[key];
          return (
            <div key={key} className={`flex min-w-0 flex-col overflow-hidden rounded-xl border transition ${current === key ? "border-brand-600 ring-2 ring-brand-600/15" : "border-gray-200 hover:border-gray-400"}`}>
              <a href={`${STOREFRONT_URL}/template-preview/${key}`} target="_blank" rel="noreferrer" aria-label={`Preview ${t.name} in a new tab`} className="block border-b border-gray-100"><TemplateThumbnail templateKey={key} /></a>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-gray-900">{t.name}</h3><span className="text-xs text-gray-500">{t.style}</span></div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.description}</p>
                <p className="mb-4 mt-2 flex-1 text-xs leading-relaxed text-gray-500">For {t.bestFor.toLowerCase()}<span className="mt-2 block font-medium text-gray-700">{t.pages.length} ready-to-edit pages</span></p>
                <div className="mb-4 flex items-center gap-1.5" aria-label="Theme colours">
                  {[t.theme.secondaryColor, t.theme.primaryColor, t.theme.accentColor].map((color, i) => <span key={i} className="h-4 w-4 rounded-full border border-black/10" style={{ background: color }} />)}
                  <span className="ml-1 text-[11px] text-gray-500">{t.theme.fontFamily}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setConfirming(key); setReplacePages(false); setError(""); }} className={`${current === key ? "btn-secondary" : "btn-primary"} flex-1 !px-2 !py-2 text-xs`}>{current === key ? "Reapply design" : "Use this design"}</button>
                  <a href={`${STOREFRONT_URL}/template-preview/${key}`} target="_blank" rel="noreferrer" className="btn-secondary !px-3 !py-2 text-xs">Preview <ArrowSquareOut size={13} /></a>
                </div>
                {current === key && <span className="mt-3 text-xs font-medium text-brand-700">Currently applied</span>}
              </div>
            </div>
          );
        })}
      </div>
      {visibleTemplates.length === 0 && <div className="rounded-xl bg-gray-50 px-6 py-12 text-center"><h3 className="font-semibold text-gray-900">Let&apos;s find a better match</h3><p className="mt-2 text-sm text-gray-500">Try a different search, style or shop type.</p><button type="button" onClick={() => { setQuery(""); setFilter("All styles"); setIndustry("All shop types"); }} className="btn-secondary mt-5">Reset filters</button></div>}

      {confirming && (
        <div ref={confirmation} tabIndex={-1} className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4" role="region" aria-label="Confirm template change">
          <p className="text-sm font-medium text-gray-900">Switch to {TEMPLATES[confirming].name}?</p>
          <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={replacePages} onChange={(e) => setReplacePages(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
            <span>
              Also replace my pages with the template&apos;s pages.
              <span className="block text-xs text-red-600">Your current page content will be lost.</span>
            </span>
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={apply} disabled={busy} className="btn-primary">{busy ? "Applying…" : "Switch template"}</button>
            <button type="button" disabled={busy} onClick={() => setConfirming(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function OnlineStorePage() {
  const authStore = useAuthStore((s) => s.store);
  const [store, setStore] = useState<{ templateKey: string; theme: Theme } | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [panel, setPanel] = useState("designs");

  useEffect(() => {
    storeApi.getMe().then((res) => setStore(res.data)).catch((err) => setError(errorMessage(err)));
  }, [version]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Online store</h1>
          <p className="text-sm text-gray-500">Build a store that feels like your brand.</p>
        </div>
        {authStore && (
          <a href={storefrontUrl(authStore.slug)} target="_blank" rel="noreferrer" className="btn-secondary">
            View store <ArrowSquareOut size={14} className="ml-1.5" />
          </a>
        )}
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!store || !authStore ? (
        <div className="space-y-6">{[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-white" />)}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid overflow-hidden rounded-xl border border-gray-200 bg-white md:grid-cols-[1fr_1fr]">
            <div className="min-w-0 border-b border-gray-200 bg-gray-50 md:border-b-0 md:border-r"><TemplateThumbnail templateKey={isTemplateKey(store.templateKey) ? store.templateKey : "classic"} /></div>
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="flex items-center gap-2 text-xs font-medium text-gray-500"><CheckCircle size={16} weight="fill" className="text-emerald-600" />Currently applied</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">{TEMPLATES[store.templateKey as TemplateKey]?.name ?? "Your design"}</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-500">Your design is the starting point. Add your photos, tell your story and make every page feel like your store.</p>
              <Link href="/store/pages/home" className="btn-primary mt-6 self-start">Edit storefront <ArrowSquareOut size={16} /></Link>
            </div>
          </div>
          <div role="tablist" aria-label="Store appearance" className="flex gap-6 border-b border-gray-200" onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault(); const next = event.key === "Home" ? "designs" : event.key === "End" ? "appearance" : panel === "designs" ? "appearance" : "designs";
            setPanel(next); document.getElementById(`store-tab-${next}`)?.focus();
          }}>
            {[["designs", "Design library"], ["appearance", "Colours & style"]].map(([value, label]) => <button key={value} id={`store-tab-${value}`} type="button" role="tab" aria-selected={panel === value} aria-controls={`store-panel-${value}`} tabIndex={panel === value ? 0 : -1} onClick={() => setPanel(value)} className={`inline-flex items-center gap-2 border-b-2 px-1 pb-4 text-sm font-medium ${panel === value ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`}>{value === "designs" ? <SquaresFour size={18} /> : <Palette size={18} />}{label}</button>)}
          </div>
          <div id="store-panel-designs" role="tabpanel" aria-labelledby="store-tab-designs" hidden={panel !== "designs"}><TemplatesCard current={store.templateKey} onApplied={() => setVersion((v) => v + 1)} /></div>
          <div id="store-panel-appearance" role="tabpanel" aria-labelledby="store-tab-appearance" hidden={panel !== "appearance"}><ThemeCard initial={store.theme} /></div>
        </div>
      )}
    </div>
  );
}
