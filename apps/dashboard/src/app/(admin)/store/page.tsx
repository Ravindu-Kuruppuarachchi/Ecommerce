"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowSquareOut, Trash, Warning } from "@phosphor-icons/react";
import { contrastRatio, FONT_OPTIONS, HEADER_STYLES, HOME_PAGE_SLUG, normalizeThemeSettings, TEMPLATE_KEYS, TEMPLATES, type TemplateKey, type ThemeSettings } from "@repo/core";
import { errorMessage, pageApi, storeApi } from "@/lib/api-client";
import { storefrontUrl } from "@/lib/urls";
import { useAuthStore } from "@/stores/auth-store";

interface PageRow {
  slug: string;
  title: string;
  publishedAt: string | null;
  updatedAt: string;
}

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

function PagesCard({ storeSlug }: { storeSlug: string }) {
  const router = useRouter();
  const [pages, setPages] = useState<PageRow[] | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    pageApi.list().then((res) => setPages(res.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await pageApi.create(newTitle.trim());
      router.push(`/store/pages/${res.data.slug}`);
    } catch (err) {
      setError(errorMessage(err, "Couldn't create the page"));
    }
  };

  const remove = async (page: PageRow) => {
    if (!window.confirm(`Delete "${page.title}"? This can't be undone.`)) return;
    try {
      await pageApi.delete(page.slug);
      setPages((p) => p!.filter((x) => x.slug !== page.slug));
    } catch (err) {
      setError(errorMessage(err, "Couldn't delete the page"));
    }
  };

  return (
    <Card title="Pages" description="Each page is built from sections. Edit a page, then publish it when you're happy.">
      {pages === null ? (
        <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
      ) : (
        <ul className="divide-y divide-gray-100">
          {pages.map((page) => (
            <li key={page.slug} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{page.title}</p>
                <p className="text-xs text-gray-500">
                  /{page.slug === HOME_PAGE_SLUG ? "" : `pages/${page.slug}`}
                  {!page.publishedAt && <span className="ml-2 badge badge-yellow">Not published</span>}
                </p>
              </div>
              <a
                href={storefrontUrl(storeSlug, page.slug === HOME_PAGE_SLUG ? "" : `/pages/${page.slug}`)}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${page.title}`}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <ArrowSquareOut size={16} />
              </a>
              {page.slug !== HOME_PAGE_SLUG && (
                <button type="button" onClick={() => remove(page)} aria-label={`Delete ${page.title}`} className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600">
                  <Trash size={16} />
                </button>
              )}
              <Link href={`/store/pages/${page.slug}`} className="btn-secondary px-3 py-1.5 text-xs">Edit</Link>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={create} className="mt-4 flex gap-2">
        <label htmlFor="new-page" className="sr-only">New page title</label>
        <input id="new-page" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New page title, e.g. Delivery info" className="input-field" />
        <button type="submit" className="btn-primary shrink-0">Add page</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
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
                <option key={h} value={h}>{h === "premium" ? "Centred name" : h === "minimal" ? "Compact" : "Standard"}</option>
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
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save theme"}</button>
          {message && <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`} role="status">{message.text}</p>}
        </div>
      </form>
    </Card>
  );
}

function TemplatesCard({ current, onApplied }: { current: string; onApplied: () => void }) {
  const [confirming, setConfirming] = useState<TemplateKey | null>(null);
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

  return (
    <Card title="Templates" description="Switching template changes your theme. Your pages stay as they are unless you choose to replace them.">
      <div className="grid gap-4 md:grid-cols-3">
        {TEMPLATE_KEYS.map((key) => {
          const t = TEMPLATES[key];
          return (
            <div key={key} className={`flex flex-col rounded-lg border p-4 ${current === key ? "border-brand-600 ring-2 ring-brand-600/15" : "border-gray-200"}`}>
              <div className="flex h-20 overflow-hidden rounded-md" aria-hidden="true" style={{ background: t.theme.secondaryColor }}>
                <div className="flex flex-1 flex-col justify-center gap-1.5 px-3">
                  <span className="h-2 w-3/4 rounded-sm" style={{ background: t.theme.primaryColor }} />
                  <span className="h-2 w-1/2 rounded-sm opacity-50" style={{ background: t.theme.primaryColor }} />
                  <span className="mt-1 h-3 w-10 rounded-sm" style={{ background: t.theme.accentColor }} />
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">{t.name}</p>
              <p className="mt-1 text-xs text-gray-600">{t.description}</p>
              <p className="mt-1 flex-1 text-xs text-gray-500">Good for: {t.bestFor.toLowerCase()}</p>
              {current === key ? (
                <span className="mt-3 text-xs font-medium text-brand-700">Current template</span>
              ) : (
                <button type="button" onClick={() => { setConfirming(key); setReplacePages(false); }} className="btn-secondary mt-3 py-1.5 text-xs">
                  Use {t.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {confirming && (
        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4" role="dialog" aria-label="Confirm template change">
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
            <button type="button" onClick={() => setConfirming(null)} className="btn-secondary">Cancel</button>
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

  useEffect(() => {
    storeApi.getMe().then((res) => setStore(res.data)).catch((err) => setError(errorMessage(err)));
  }, [version]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Online store</h1>
          <p className="text-sm text-gray-500">Your template, pages and theme.</p>
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
          <PagesCard key={`pages-${version}`} storeSlug={authStore.slug} />
          <ThemeCard initial={store.theme} />
          <TemplatesCard current={store.templateKey} onApplied={() => setVersion((v) => v + 1)} />
        </div>
      )}
    </div>
  );
}
