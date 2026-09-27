"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("merchant@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      // Only same-site paths, so ?next= can't be used to bounce users to another site.
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && /^\/(?!\/)/.test(next) ? next : "/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand / illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white flex-col justify-between p-12">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">ShopHub</h1>
          <p className="text-brand-200 text-sm mt-1">E-Commerce SaaS Platform</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Launch your <br />
            online store <br />
            <span className="text-brand-300">in minutes.</span>
          </h2>
          <p className="text-brand-200 max-w-md leading-relaxed">
            Manage products, process orders, and grow your business — all from one powerful dashboard.
          </p>

          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-3xl font-bold">10k+</p>
              <p className="text-brand-300 text-sm">Active stores</p>
            </div>
            <div>
              <p className="text-3xl font-bold">$2M+</p>
              <p className="text-brand-300 text-sm">Monthly volume</p>
            </div>
            <div>
              <p className="text-3xl font-bold">99.9%</p>
              <p className="text-brand-300 text-sm">Uptime</p>
            </div>
          </div>
        </div>

        <p className="text-brand-400 text-xs">
          &copy; {new Date().getFullYear()} ShopHub. All rights reserved.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              ShopHub
            </h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 text-sm mt-1">
                Sign in to your merchant dashboard
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm animate-slide-up">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-base"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Signing in…
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm mt-6">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-brand-600 font-medium hover:text-brand-700 transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-brand-50 rounded-xl border border-brand-100 text-sm">
            <p className="font-semibold text-brand-800 mb-2 flex items-center gap-1.5">
              <span>🔑</span> Demo Credentials
            </p>
            <div className="space-y-1 text-brand-700">
              <p>
                <span className="text-brand-500">Email:</span>{" "}
                <code className="bg-brand-100 px-1.5 py-0.5 rounded text-xs font-mono">
                  merchant@example.com
                </code>
              </p>
              <p>
                <span className="text-brand-500">Password:</span>{" "}
                <code className="bg-brand-100 px-1.5 py-0.5 rounded text-xs font-mono">
                  password123
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
