import { createHash } from "node:crypto";
import type { Customer } from "@prisma/client";
import { asyncHandler, HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      customer?: Customer;
      customerSessionId?: string;
    }
  }
}

export const customerTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export const requireCustomerAuth = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme !== "Bearer" || !token || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, "Sign in with Google before making a purchase");
  const session = await prisma.customerSession.findUnique({ where: { tokenHash: customerTokenHash(token) }, include: { customer: true, store: true } });
  if (!session || session.expiresAt <= new Date() || session.customer.storeId !== session.storeId || !session.customer.googleSubject) {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }
  if (session.store.status === "suspended") throw new HttpError(403, "This store is unavailable");
  if (req.headers["x-store-slug"] && req.headers["x-store-slug"] !== session.store.slug) throw new HttpError(403, "Sign in to this store to continue");
  req.customer = session.customer;
  req.customerSessionId = session.id;
  next();
});
