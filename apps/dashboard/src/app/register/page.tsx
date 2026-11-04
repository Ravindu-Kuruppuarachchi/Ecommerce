"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import AccountLayout from "@/components/AccountLayout";
import TemplateThumbnail from "@/components/TemplateThumbnail";
import { STOREFRONT_URL } from "@/lib/urls";
import { TEMPLATE_KEYS, TEMPLATES } from "@repo/core";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    firstName: "", lastName: "",
    storeName: "", storeSlug: "",
    templateKey: "classic",
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!form.storeSlug) {
      setError("Store URL slug is required");
      return;
    }

    setIsLoading(true);
    try {
      const { confirmPassword: _confirm, ...input } = form;
      await register(input);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AccountLayout register>
          <div className="voxel-account-card">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Create your store</h1>
              <p className="text-gray-500 text-sm mt-1">Set up your account and start selling</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm animate-slide-up" role="alert">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className={`grid gap-3 ${showTemplates ? "grid-cols-2" : "grid-cols-1"}`}>
                <div>
                  <label htmlFor="register-firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" required id="register-firstName" autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} className="input-field" placeholder="John" />
                </div>
                <div>
                  <label htmlFor="register-lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" required id="register-lastName" autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} className="input-field" placeholder="Doe" />
                </div>
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required id="register-email" autoComplete="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field" placeholder="you@example.com" />
              </div>

              <div className={`grid gap-3 ${showTemplates ? "grid-cols-2" : "grid-cols-1"}`}>
                <div>
                  <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" required id="register-password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="input-field" placeholder="••••••••" />
                </div>
                <div>
                  <label htmlFor="register-confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
                  <input type="password" required id="register-confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({...form, confirmPassword: e.target.value})} className="input-field" placeholder="••••••••" />
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <label htmlFor="register-storeName" className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                <input type="text" required id="register-storeName" autoComplete="organization" value={form.storeName} onChange={(e) => {
                  setForm({...form, storeName: e.target.value, storeSlug: generateSlug(e.target.value)});
                }} className="input-field" placeholder="My Awesome Store" />
              </div>

              <div>
                <label htmlFor="register-storeSlug" className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2 shrink-0 text-xs">{STOREFRONT_URL.replace("https://", "").replace("http://", "")}/</span>
                  <input type="text" required id="register-storeSlug" autoComplete="off" value={form.storeSlug} onChange={(e) => setForm({...form, storeSlug: generateSlug(e.target.value)})} className="input-field min-w-0 flex-1 font-mono text-sm" placeholder="my-store" />
                </div>
              </div>

              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-2">Template</legend>
                <p className="text-xs text-gray-500 mb-3">You can switch or customise it any time.</p>
                <div className={`grid gap-3 ${showTemplates ? "grid-cols-2" : "grid-cols-1"}`}>
                  {(showTemplates ? TEMPLATE_KEYS : TEMPLATE_KEYS.filter((key) => key === form.templateKey)).map((key) => {
                    const t = TEMPLATES[key];
                    const selected = form.templateKey === key;
                    return (
                      <label
                        key={key}
                        className={`cursor-pointer rounded-lg border p-2 transition focus-within:ring-2 focus-within:ring-brand-600 ${selected ? "border-brand-600 ring-2 ring-brand-600/20" : "border-gray-200 hover:border-gray-300"}`}
                      >
                        <input type="radio" name="template" value={key} checked={selected} onChange={() => setForm({ ...form, templateKey: key })} className="sr-only" />
                        <span className="block overflow-hidden rounded-md [&>div]:h-28"><TemplateThumbnail templateKey={key} /></span>
                        <span className="mt-1.5 block text-xs font-medium text-gray-900">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setShowTemplates((show) => !show)} aria-expanded={showTemplates} className="mt-3 text-xs font-medium text-brand-700 hover:underline">{showTemplates ? "Keep selected design" : `Browse all ${TEMPLATE_KEYS.length} designs`}</button>
                <p className="mt-3 text-xs text-gray-500">{TEMPLATES[form.templateKey as keyof typeof TEMPLATES].bestFor}</p>
                <a href={`${STOREFRONT_URL}/template-preview/${form.templateKey}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-brand-700 underline underline-offset-4">Preview {TEMPLATES[form.templateKey as keyof typeof TEMPLATES].name} in a new tab</a>
              </fieldset>

              <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-base mt-2">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Creating store…
                  </span>
                ) : "Create Store & Sign In"}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700 transition-colors">Sign in</Link>
            </p>
          </div>
    </AccountLayout>
  );
}
