import { createHmac, timingSafeEqual } from "node:crypto";
import type { Store } from "@prisma/client";
import jwt from "jsonwebtoken";
import { MODULES, type ModuleKey } from "@repo/core";
import { env } from "../lib/env";
import { asyncHandler, HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";
import { activeModules } from "../services/modules";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
      /** The signed-in merchant's store, set by requireStore. */
      store?: Store;
    }
  }
}

// A keyed fingerprint invalidates every older token when the password changes.
// Neither the password nor its bcrypt hash is included in the token.
const credentialTag = (password: string) => createHmac("sha256", env.jwtSecret).update(password).digest("hex");

export function signToken(user: { id: string; email: string; password: string }): string {
  return jwt.sign({ sub: user.id, credentialTag: credentialTag(user.password) }, env.jwtSecret, { expiresIn: "7d", algorithm: "HS256" });
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme !== "Bearer" || !token) throw new HttpError(401, "Unauthorized");
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    if (typeof payload.sub !== "string") throw new Error("token has no subject");
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, password: true } });
    if (!user || typeof payload.credentialTag !== "string") throw new Error("Session revoked");
    const expected = Buffer.from(credentialTag(user.password));
    const actual = Buffer.from(payload.credentialTag);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error("Session revoked");
    req.user = { id: user.id, email: user.email };
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
  next();
});

/**
 * Loads the store owned by the signed-in merchant. Every merchant route must
 * run this and scope its queries by req.store.id.
 */
export const requireStore = asyncHandler(async (req, _res, next) => {
  if (!req.user) throw new HttpError(401, "Unauthorized");
  // One store per merchant for now; multi-store accounts would pick via a header here.
  const store = await prisma.store.findFirst({ where: { ownerId: req.user.id }, orderBy: { createdAt: "asc" } });
  if (!store) throw new HttpError(404, "Store not found");
  req.store = store;
  next();
});

export function requireModule(key: ModuleKey) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.store) throw new HttpError(500, "requireModule used without requireStore");
    if (!MODULES[key].core) {
      if (!(await activeModules(req.store.id)).has(key)) {
        throw new HttpError(403, `The ${MODULES[key].label} feature isn't enabled for this store`);
      }
    }
    next();
  });
}

export const merchant = [requireAuth, requireStore];

/**
 * Platform staff only. The role is read from the database on every request,
 * not from the token, so revoking access takes effect immediately.
 */
export const requirePlatformAdmin = asyncHandler(async (req, _res, next) => {
  if (!req.user) throw new HttpError(401, "Unauthorized");
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
  if (user?.role !== "platform_admin") throw new HttpError(403, "Platform admins only");
  next();
});

export const platformAdmin = [requireAuth, requirePlatformAdmin];
