"use client";

import { API_URL } from "./api";

export type TrackEvent = "page_view" | "product_view" | "add_to_cart" | "checkout_start";

/** Random id for this browser tab's visit. Not tied to a person and never leaves this store's analytics. */
function sessionId(): string {
  try {
    let id = sessionStorage.getItem("s-visit");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("s-visit", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Fire-and-forget: analytics must never slow down or break shopping. */
export function track(storeSlug: string, type: TrackEvent, extra: { productId?: string } = {}) {
  if (typeof window === "undefined" || location.pathname.endsWith("/preview")) return;
  fetch(`${API_URL}/stores/${encodeURIComponent(storeSlug)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, sessionId: sessionId(), path: location.pathname.slice(0, 200), ...extra }),
    keepalive: true,
  }).catch(() => undefined);
}
