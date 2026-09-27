"use client";

import { useSearchParams, redirect } from "next/navigation";
import { Suspense } from "react";

function StorefrontRedirect() {
  const searchParams = useSearchParams();
  const storeSlug = searchParams.get("store");

  if (storeSlug) {
    redirect(`/${storeSlug}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center animate-fade-in max-w-lg px-8">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
          ShopHub
        </h1>
        <p className="text-gray-500 text-lg mb-8">
          Multi-tenant storefront platform
        </p>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-600 mb-3">
            To view a specific store, visit:
          </p>
          <code className="block bg-gray-50 rounded-lg px-4 py-3 text-sm font-mono text-gray-700 border">
            http://localhost:3001?store=<span className="text-blue-600">johns-coffee</span>
          </code>
        </div>
      </div>
    </div>
  );
}

export default function StorefrontRoot() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin"></div>
        </div>
      }
    >
      <StorefrontRedirect />
    </Suspense>
  );
}
