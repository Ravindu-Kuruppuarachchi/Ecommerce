import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { customerCookie, googleConfigured, sessionCookieOptions, validStoreSlug } from "@/lib/customer-server";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  let store = "";
  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, req.url));
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set("customer-google-flow", "", { ...sessionCookieOptions, maxAge: 0 });
    return response;
  };
  try {
    const flow = JSON.parse(Buffer.from(req.cookies.get("customer-google-flow")?.value || "", "base64url").toString());
    if (!validStoreSlug(flow.store)) throw Error("Invalid store");
    store = flow.store;
    const state = req.nextUrl.searchParams.get("state") || "";
    if (!googleConfigured() || typeof flow.state !== "string" || state.length !== flow.state.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(flow.state)) || typeof flow.createdAt !== "number" ||
      Date.now() - flow.createdAt > 600_000 || flow.createdAt > Date.now() || !["checkout", "account"].includes(flow.target) ||
      typeof flow.nonce !== "string" || typeof flow.verifier !== "string" || new URL(process.env.GOOGLE_REDIRECT_URI!).origin !== req.nextUrl.origin) throw Error("Invalid login state");
    const code = req.nextUrl.searchParams.get("code");
    if (!code || req.nextUrl.searchParams.has("error")) throw Error("Google sign-in cancelled");
    const google = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", signal: AbortSignal.timeout(10000), cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!, grant_type: "authorization_code", code_verifier: flow.verifier }),
    });
    const tokens = await google.json();
    if (!google.ok || typeof tokens.id_token !== "string") throw Error("Google exchange failed");
    const login = await fetch(`${API_URL}/customer-auth/google`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000), cache: "no-store",
      body: JSON.stringify({ storeSlug: store, idToken: tokens.id_token, nonce: flow.nonce }),
    });
    const session = await login.json();
    if (!login.ok || typeof session.token !== "string") throw Error("Customer login failed");
    const response = finish(`/${store}/${flow.target}`);
    response.cookies.set(customerCookie(store), session.token, sessionCookieOptions);
    return response;
  } catch {
    if (store) return finish(`/${store}/account?error=google`);
    const response = NextResponse.json({ error: "This sign-in attempt expired. Return to your store and try again." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    response.cookies.set("customer-google-flow", "", { ...sessionCookieOptions, maxAge: 0 });
    return response;
  }
}
