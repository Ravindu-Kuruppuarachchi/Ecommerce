import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "./api";

export const customerCookie = (slug: string) => `customer-session-${slug}`;
export const sessionCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 7 * 86400 };
export const validStoreSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 60;
export function googleConfigured(): boolean {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) return false;
  try {
    const url = new URL(process.env.GOOGLE_REDIRECT_URI);
    return !url.username && !url.password && !url.search && !url.hash && url.pathname === "/api/customer/google/callback" &&
      (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
  } catch { return false; }
}

/** Cookie credentials never enter JavaScript or localStorage. Mutations are same-origin only. */
export async function customerProxy(req: NextRequest, store: string, action: string) {
  if (!validStoreSlug(store)) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  if (req.method !== "GET" && req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const allowed: Record<string, string> = { "GET:session": "/customer-auth/session", "GET:orders": "/customer-auth/orders", "PATCH:profile": "/customer-auth/profile", "DELETE:session": "/customer-auth/session", "POST:checkout": "/orders" };
  const endpoint = allowed[`${req.method}:${action}`];
  if (!endpoint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const token = req.cookies.get(customerCookie(store))?.value;
  if (!token && req.method === "GET" && action === "session") return NextResponse.json({ customer: null }, { headers: { "Cache-Control": "no-store" } });
  if (!token) return NextResponse.json({ error: "Sign in with Google to continue" }, { status: 401 });
  let body: unknown;
  if (["POST", "PATCH"].includes(req.method)) {
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Expected an object" }, { status: 400 });
  }
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: req.method, cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Store-Slug": store },
      body: body === undefined ? undefined : JSON.stringify(action === "checkout" ? { ...(body as Record<string, unknown>), storeSlug: store } : body),
    });
    const result = NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
    if (response.status === 401 || req.method === "DELETE") result.cookies.set(customerCookie(store), "", { ...sessionCookieOptions, maxAge: 0 });
    return result;
  } catch {
    return NextResponse.json({ error: "We couldn't reach the store. Please try again." }, { status: 503 });
  }
}
