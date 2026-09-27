"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    firstName: "", lastName: "",
    storeName: "", storeSlug: "",
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
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!form.storeSlug) {
      setError("Store URL slug is required");
      return;
    }

    setIsLoading(true);
    try {
      await register(form.email, form.password, form.firstName, form.lastName, form.storeName, form.storeSlug);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white flex-col justify-between p-12">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">ShopHub</h1>
          <p className="text-brand-200 text-sm mt-1">E-Commerce SaaS Platform</p>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Start selling<br />online <span className="text-brand-300">today.</span>
          </h2>
          <p className="text-brand-200 max-w-md leading-relaxed">
            Create your store in minutes. No credit card required. Start with our free plan and upgrade as you grow.
          </p>
          <div className="flex gap-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-brand-200">
              <span className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              Free to start
            </div>
            <div className="flex items-center gap-2 text-sm text-brand-200">
              <span className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              No code needed
            </div>
            <div className="flex items-center gap-2 text-sm text-brand-200">
              <span className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              Instant setup
            </div>
          </div>
        </div>
        <p className="text-brand-400 text-xs">&copy; {new Date().getFullYear()} ShopHub</p>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">ShopHub</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create your store</h2>
              <p className="text-gray-500 text-sm mt-1">Set up your account and start selling</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm animate-slide-up">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" required value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} className="input-field" placeholder="John" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" required value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} className="input-field" placeholder="Doe" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field" placeholder="you@example.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" required value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="input-field" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
                  <input type="password" required value={form.confirmPassword} onChange={(e) => setForm({...form, confirmPassword: e.target.value})} className="input-field" placeholder="••••••••" />
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                <input type="text" required value={form.storeName} onChange={(e) => {
                  setForm({...form, storeName: e.target.value, storeSlug: generateSlug(e.target.value)});
                }} className="input-field" placeholder="My Awesome Store" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-400 mr-1">yourplatform.com/</span>
                  <input type="text" required value={form.storeSlug} onChange={(e) => setForm({...form, storeSlug: generateSlug(e.target.value)})} className="input-field flex-1 font-mono text-sm" placeholder="my-store" />
                </div>
              </div>

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
        </div>
      </div>
    </div>
  );
}
