"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Warning } from "@phosphor-icons/react";
import { contrastRatio, FONT_OPTIONS, HEADER_STYLES, normalizeThemeSettings, type ThemeSettings } from "@repo/core";
import { errorMessage, storeApi } from "@/lib/api-client";
export interface Theme {
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

export default function ThemeCard({ initial, onSaved }: { initial: Theme; onSaved?: () => void }) {
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
      setMessage({ ok: true, text: "Theme saved. Changes apply to your live store." });
      onSaved?.();
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
        <div className="grid gap-4 xl:grid-cols-2">
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
        <div className="grid gap-4 xl:grid-cols-2">
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
        <div className="grid gap-4 xl:grid-cols-2">
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

