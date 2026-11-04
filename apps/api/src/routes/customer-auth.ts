import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod/v3";
import { customerProfileSchema } from "@repo/core";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { customerTokenHash, requireCustomerAuth } from "../middleware/customer-auth";
import { rateLimit } from "../middleware/rate-limit";
import { verifyGoogleIdentity } from "../services/google-identity";

export const customerAuthRouter = Router();
const publicProfile = (customer: { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null; avatarUrl: string | null; savedAddress: unknown }) => ({
  id: customer.id, email: customer.email, firstName: customer.firstName, lastName: customer.lastName,
  phone: customer.phone, avatarUrl: customer.avatarUrl, savedAddress: customer.savedAddress,
});

customerAuthRouter.post("/google", rateLimit({ windowMs: 15 * 60_000, max: 300 }), asyncHandler(async (req, res, next) => {
  const body = parseBody(z.object({ storeSlug: z.string().min(1).max(60), idToken: z.string().min(1).max(12000), nonce: z.string().min(32).max(200) }), req.body);
  res.locals.googleIdentity = await verifyGoogleIdentity(body.idToken, body.nonce);
  res.locals.storeSlug = body.storeSlug;
  next();
}), rateLimit({ windowMs: 15 * 60_000, max: 20, keyGenerator: (_req, res) => res.locals.googleIdentity.sub }), asyncHandler(async (_req, res) => {
  const identity = res.locals.googleIdentity as Awaited<ReturnType<typeof verifyGoogleIdentity>>;
  const store = await prisma.store.findUnique({ where: { slug: res.locals.storeSlug } });
  if (!store || store.status === "suspended") throw new HttpError(404, "Store not found");
  const token = randomBytes(32).toString("hex");
  const customer = await prisma.$transaction(async tx => {
    const existing = await tx.customer.findUnique({ where: { storeId_googleSubject: { storeId: store.id, googleSubject: identity.sub } } })
      ?? await tx.customer.findUnique({ where: { storeId_email: { storeId: store.id, email: identity.email } } });
    if (existing?.googleSubject && existing.googleSubject !== identity.sub) throw new HttpError(409, "This email is already linked to another Google account");
    const emailOwner = await tx.customer.findUnique({ where: { storeId_email: { storeId: store.id, email: identity.email } } });
    if (existing && emailOwner && existing.id !== emailOwner.id) throw new HttpError(409, "Contact the store to update your account email");
    const data = { email: identity.email, googleSubject: identity.sub, avatarUrl: identity.picture ?? null,
      firstName: existing?.firstName ?? identity.given_name, lastName: existing?.lastName ?? identity.family_name };
    const customer = existing
      ? await tx.customer.update({ where: { id: existing.id }, data })
      : await tx.customer.create({ data: { ...data, storeId: store.id } });
    await tx.customerSession.deleteMany({ where: { customerId: customer.id, expiresAt: { lte: new Date() } } });
    await tx.customerSession.create({ data: { customerId: customer.id, storeId: store.id, tokenHash: customerTokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400_000) } });
    return customer;
  });
  res.set("Cache-Control", "no-store").json({ token, customer: publicProfile(customer) });
}));

customerAuthRouter.use(requireCustomerAuth);
customerAuthRouter.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
customerAuthRouter.get("/session", (req, res) => res.json({ customer: publicProfile(req.customer!) }));
customerAuthRouter.delete("/session", asyncHandler(async (req, res) => {
  await prisma.customerSession.deleteMany({ where: { id: req.customerSessionId!, customerId: req.customer!.id, storeId: req.customer!.storeId } });
  res.json({ message: "Signed out" });
}));
customerAuthRouter.patch("/profile", asyncHandler(async (req, res) => {
  const body = parseBody(customerProfileSchema, req.body);
  const customer = await prisma.customer.update({ where: { id: req.customer!.id, storeId: req.customer!.storeId }, data: { ...body, savedAddress: body.savedAddress ?? Prisma.DbNull } });
  res.json({ customer: publicProfile(customer) });
}));
customerAuthRouter.get("/orders", asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { storeId: req.customer!.storeId, customerId: req.customer!.id }, orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, orderNumber: true, status: true, paymentStatus: true, fulfillmentStatus: true, totalCents: true, currency: true, createdAt: true,
      items: { select: { productName: true, variantTitle: true, quantity: true, unitPriceCents: true } } },
  });
  res.json({ orders });
}));
