"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CustomerSignIn({ storeSlug, checkout = false }: { storeSlug: string; checkout?: boolean }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(new URLSearchParams(window.location.search).has("error"));
    let active = true;
    fetch("/api/customer/google/config", { cache: "no-store" }).then(response => response.json()).then(data => { if (active) setConfigured(data.configured === true); }).catch(() => { if (active) setConfigured(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="mx-auto max-w-lg px-4 py-16 text-center sm:px-8" aria-labelledby="customer-sign-in-heading">
      <p className="text-xs font-medium uppercase tracking-widest text-store-muted">Your account</p>
      <h1 id="customer-sign-in-heading" className="mt-3 font-heading text-3xl font-semibold">{checkout ? "Sign in to check out" : "Welcome to your account"}</h1>
      <p className="mt-4 text-sm leading-6 text-store-muted">Continue with Google to keep your profile, delivery details and orders together.{checkout && " Your cart will be waiting for you."}</p>
      {failed && <p role="alert" className="mt-5 text-sm text-red-700">Google sign-in was cancelled or could not be completed. Please try again.</p>}
      {configured ? (
        <a href={`/api/customer/google/start?store=${encodeURIComponent(storeSlug)}&next=${checkout ? "checkout" : "account"}`} className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-control border border-store-line bg-store-bg px-6 py-3 text-sm font-medium text-store-fg hover:bg-store-surface">
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4.1 1.9-6.8 1.9-5.3 0-9.8-3.6-11.4-8.4H5.7v5.3A20.4 20.4 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.6 27.5a12.2 12.2 0 0 1 0-7.8v-5.3H5.7a20 20 0 0 0 0 18.4z"/><path fill="#EA4335" d="M24 11.3c3 0 5.6 1 7.7 3l5.8-5.8A19.7 19.7 0 0 0 24 3 20.4 20.4 0 0 0 5.7 14.4l6.9 5.3A12 12 0 0 1 24 11.3z"/></svg>
          Continue with Google
        </a>
      ) : (
        <div className="mt-8"><button type="button" disabled className="btn-secondary opacity-60">{configured === null ? "Loading sign-in…" : "Continue with Google"}</button>
          {configured === false && <p role="status" className="mt-4 text-sm text-store-muted">Google sign-in is temporarily unavailable. Please contact this store.</p>}
        </div>
      )}
      <p className="mt-8"><Link href={`/${storeSlug}/products`} className="text-sm underline underline-offset-4">Continue browsing</Link></p>
    </section>
  );
}
