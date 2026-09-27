"use client";

import { useState, type FormEvent } from "react";
import { API_URL } from "@/lib/api";

export default function NewsletterForm({ storeSlug, disabled = false }: { storeSlug: string; disabled?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setState("sending");
    try {
      const res = await fetch(`${API_URL}/stores/${storeSlug}/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't sign you up");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign you up");
      setState("error");
    }
  };

  if (state === "done") return <p className="font-medium" role="status">You&apos;re on the list. Thanks for signing up.</p>;

  return (
    <form onSubmit={submit} noValidate={false}>
      <label htmlFor={`newsletter-${storeSlug}`} className="field-label">Email address</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={`newsletter-${storeSlug}`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
        <button type="submit" disabled={state === "sending"} className="btn-primary">
          {state === "sending" ? "Signing up…" : "Sign up"}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    </form>
  );
}
