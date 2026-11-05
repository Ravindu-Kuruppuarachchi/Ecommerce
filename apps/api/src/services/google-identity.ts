import { createPublicKey, type JsonWebKey } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod/v3";
import { env } from "../lib/env";
import { HttpError } from "../lib/http";

const claimsSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.string().email().transform(value => value.toLowerCase()),
  email_verified: z.literal(true),
  nonce: z.string().min(1),
  exp: z.number(),
  iat: z.number(),
  given_name: z.string().max(60).optional(),
  family_name: z.string().max(60).optional(),
  picture: z.string().url().refine(value => value.startsWith("https://")).optional(),
  azp: z.string().optional(),
});

let cached: { keys: Array<JsonWebKey & { kid: string }>; until: number } | undefined;

/** The only identity accepted for a customer account is a verified Google ID token. */
export async function verifyGoogleIdentity(idToken: string, nonce: string) {
  if (!env.googleClientId) throw new HttpError(503, "Google sign-in has not been configured yet");
  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || decoded.header.alg !== "RS256" || !decoded.header.kid) throw Error("Invalid token header");
    if (!cached || cached.until <= Date.now() || !cached.keys.some(key => key.kid === decoded.header.kid)) {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw Error("Google keys unavailable");
      const body = await response.json() as { keys: Array<JsonWebKey & { kid: string }> };
      cached = { keys: body.keys, until: Date.now() + 60 * 60_000 };
    }
    const jwk = cached.keys.find(key => key.kid === decoded.header.kid);
    if (!jwk) throw Error("Unknown signing key");
    const claims = claimsSchema.parse(jwt.verify(idToken, createPublicKey({ key: jwk, format: "jwk" }), {
      algorithms: ["RS256"], audience: env.googleClientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    }));
    if (claims.nonce !== nonce || claims.iat > Date.now() / 1000 + 60 || (claims.azp && claims.azp !== env.googleClientId)) throw Error("Invalid login binding");
    return claims;
  } catch {
    throw new HttpError(401, "Google sign-in could not be verified. Please try again.");
  }
}
