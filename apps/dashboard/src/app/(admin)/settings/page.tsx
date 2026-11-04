"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { storeApi } from "@/lib/api-client";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const { token, store: authStore } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [storeForm, setStoreForm] = useState({
    name: "",
    description: "",
    taxRate: "0",
  });

  const [themeForm, setThemeForm] = useState({
    primaryColor: "#000000",
    secondaryColor: "#FFFFFF",
    accentColor: "#3b82f6",
    fontFamily: "Inter",
    headerStyle: "minimal",
  });

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadStore();
  }, [token, router]);

  const loadStore = async () => {
    try {
      const res = await storeApi.getMe();
      const store = res.data;
      setStoreForm({
        name: store.name || "",
        description: store.description || "",
        taxRate: String((store.taxBps ?? 0) / 100),
      });
      if (store.theme) {
        setThemeForm({
          primaryColor: store.theme.primaryColor || "#000000",
          secondaryColor: store.theme.secondaryColor || "#FFFFFF",
          accentColor: store.theme.accentColor || "#3b82f6",
          fontFamily: store.theme.fontFamily || "Inter",
          headerStyle: store.theme.headerStyle || "minimal",
        });
      }
    } catch (error) {
      console.error("Failed to load store:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await storeApi.update({
        name: storeForm.name,
        description: storeForm.description,
        taxBps: Math.round(parseFloat(storeForm.taxRate || "0") * 100),
      });
      setMessage({ type: "success", text: "Store settings saved!" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await storeApi.updateTheme(themeForm);
      setMessage({ type: "success", text: "Theme updated!" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update theme" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!token) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure your store details and theme
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`px-4 py-3 rounded-lg mb-6 text-sm animate-slide-up ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.type === "success" ? "✅" : "❌"} {message.text}
          </div>
        )}

        {/* Store Details */}
        <form
          onSubmit={handleSaveStore}
          className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Store Details
            </h2>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Store Name
              </label>
              <input
                type="text"
                value={storeForm.name}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, name: e.target.value })
                }
                className="input-field"
                placeholder="My Store"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={storeForm.description}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, description: e.target.value })
                }
                className="input-field resize-none"
                placeholder="Tell customers about your store"
              />
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={storeForm.taxRate}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, taxRate: e.target.value })
                }
                className="input-field"
              />
            </div>

            {/* Store URL */}
            <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Your Storefront URL
              </p>
              <code className="text-sm text-gray-700 font-mono">
                http://localhost:3001?store={authStore?.slug}
              </code>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100">
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </form>

        {/* Theme Settings */}
        <form
          onSubmit={handleSaveTheme}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Theme & Appearance
            </h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Color Pickers */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeForm.primaryColor}
                    onChange={(e) =>
                      setThemeForm({
                        ...themeForm,
                        primaryColor: e.target.value,
                      })
                    }
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={themeForm.primaryColor}
                    onChange={(e) =>
                      setThemeForm({
                        ...themeForm,
                        primaryColor: e.target.value,
                      })
                    }
                    className="input-field text-xs font-mono flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Secondary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeForm.secondaryColor}
                    onChange={(e) =>
                      setThemeForm({
                        ...themeForm,
                        secondaryColor: e.target.value,
                      })
                    }
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={themeForm.secondaryColor}
                    onChange={(e) =>
                      setThemeForm({
                        ...themeForm,
                        secondaryColor: e.target.value,
                      })
                    }
                    className="input-field text-xs font-mono flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeForm.accentColor}
                    onChange={(e) =>
                      setThemeForm({
                        ...themeForm,
                        accentColor: e.target.value,
                      })
                    }
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={themeForm.accentColor}
                    onChange={(e) =>
                      setThemeForm({
                        ...themeForm,
                        accentColor: e.target.value,
                      })
                    }
                    className="input-field text-xs font-mono flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Font Family
              </label>
              <select
                value={themeForm.fontFamily}
                onChange={(e) =>
                  setThemeForm({ ...themeForm, fontFamily: e.target.value })
                }
                className="input-field"
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="Outfit">Outfit</option>
                <option value="system-ui">System Default</option>
              </select>
            </div>

            {/* Header Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Store Template
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "minimal", label: "Minimal", desc: "Clean & modern" },
                  {
                    value: "standard",
                    label: "Standard",
                    desc: "Classic e-commerce",
                  },
                  {
                    value: "premium",
                    label: "Premium",
                    desc: "Bold & editorial",
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      themeForm.headerStyle === opt.value
                        ? "border-brand-600 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="headerStyle"
                      value={opt.value}
                      checked={themeForm.headerStyle === opt.value}
                      onChange={(e) =>
                        setThemeForm({
                          ...themeForm,
                          headerStyle: e.target.value,
                        })
                      }
                      className="sr-only"
                    />
                    <p className="font-semibold text-sm text-gray-900">
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div
                className="px-6 py-4 text-center"
                style={{
                  backgroundColor: themeForm.primaryColor,
                  color: themeForm.secondaryColor,
                  fontFamily: themeForm.fontFamily,
                }}
              >
                <p className="font-bold text-lg">{storeForm.name || "Your Store"}</p>
                <p className="text-sm opacity-70">Live theme preview</p>
              </div>
              <div className="p-4 bg-gray-50 flex items-center justify-center gap-3">
                <div
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: themeForm.accentColor }}
                >
                  Add to Cart
                </div>
                <div
                  className="px-4 py-2 rounded-lg text-sm font-medium border"
                  style={{
                    borderColor: themeForm.accentColor,
                    color: themeForm.accentColor,
                  }}
                >
                  View Details
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100">
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? "Saving…" : "Save Theme"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
