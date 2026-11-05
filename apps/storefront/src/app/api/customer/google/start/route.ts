import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { googleConfigured, sessionCookieOptions, validStoreSlug } from "@/lib/customer-server";

export const dynamic = "force-dynamic";
export function GET(req: NextRequest) {
  const store = req.nextUrl.searchParams.get("store") || "";
  if (!validStoreSlug(store)) return NextResponse.json({ error: "Invalid store" }, { status: 400 });
  const target = req.nextUrl.searchParams.get("next") === "checkout" ? "checkout" : "account";
  const failure = new URL(`/${store}/account?error=unavailable`, req.url);
  if (!googleConfigured()) return NextResponse.redirect(failure);
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
  if (new URL(redirectUri).origin !== req.nextUrl.origin) return NextResponse.redirect(failure);
  const state = randomBytes(32).toString("hex");
  const nonce = randomBytes(32).toString("hex");
  const verifier = randomBytes(48).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri,
    response_type: "code", scope: "openid email profile", state, nonce, prompt: "select_account",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set("customer-google-flow", Buffer.from(JSON.stringify({ state, nonce, verifier, store, target, createdAt: Date.now() })).toString("base64url"), { ...sessionCookieOptions, maxAge: 600 });
  return response;
}
