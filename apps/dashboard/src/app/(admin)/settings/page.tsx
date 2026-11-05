"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { storeApi } from "@/lib/api-client";
import { storefrontUrl } from "@/lib/urls";
import ChangePasswordForm from "@/components/ChangePasswordForm";

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
            Manage your store details, tax rate and account password
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
                max="50"
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
              {authStore && <a href={storefrontUrl(authStore.slug)} target="_blank" rel="noreferrer" className="break-all text-sm text-brand-700 underline">
                {storefrontUrl(authStore.slug)}
              </a>}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100">
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </form>

        <ChangePasswordForm />

      </div>
    </div>
  );
}
