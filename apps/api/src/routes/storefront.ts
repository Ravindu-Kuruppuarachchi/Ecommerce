import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { rateLimit } from "../middleware/rate-limit";
import { activeModules } from "../services/modules";
import { quote } from "../services/pricing";

// Public endpoints the storefront calls during shopping and checkout.
export const storefrontRouter = Router();

async function openStore(slug: string) {
  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!store || store.status === "suspended") throw new HttpError(404, "Store not found");
  return store;
}

storefrontRouter.get(
  "/:slug/shipping",
  asyncHandler(async (req, res) => {
    const store = await openStore(req.params.slug);
    if (!(await activeModules(store.id)).has("shipping")) return res.json({ enabled: false, zones: [] });
    const zones = await prisma.shippingZone.findMany({
      where: { storeId: store.id },
      orderBy: { position: "asc" },
      select: { name: true, districts: true, rateCents: true, freeOverCents: true, estimatedDays: true },
    });
    res.json({ enabled: true, zones });
  }),
);

/**
 * Live delivery and discount quote for the checkout page. The subtotal comes
 * from the client, so this is only a preview; placing the order reprices
 * everything from the database.
 */
storefrontRouter.post(
  "/:slug/quote",
  // Also slows down anyone guessing discount codes.
  rateLimit({ windowMs: 10 * 60_000, max: 60 }),
  asyncHandler(async (req, res) => {
    const store = await openStore(req.params.slug);
    const body = parseBody(
      z.object({
        subtotalCents: z.number().int().min(0).max(1_000_000_000),
        district: z.string().max(40).optional(),
        code: z.string().trim().max(40).optional(),
      }),
      req.body,
    );
    const q = await quote(prisma, store.id, { ...body, code: body.code || undefined });
    res.json({
      zone: q.zone && { name: q.zone.name, estimatedDays: q.zone.estimatedDays, freeOverCents: q.zone.freeOverCents },
      shippingCents: q.shipping,
      shippingBeforeDiscountCents: q.shippingBeforeDiscount,
      discount: q.discount && { title: q.discount.title, code: q.discount.code, type: q.discount.type },
      discountCents: q.discountCents,
    });
  }),
);

const EVENT_TYPES = ["page_view", "product_view", "add_to_cart", "checkout_start"] as const;

storefrontRouter.post(
  "/:slug/events",
  rateLimit({ windowMs: 60_000, max: 120 }),
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        type: z.enum(EVENT_TYPES),
        // Random id the browser generates; not linked to a person.
        sessionId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/),
        path: z.string().max(200).optional(),
        productId: z.string().max(40).optional(),
      }),
      req.body,
    );
    const store = await openStore(req.params.slug);
    // Recorded for every store: the platform admin reports traffic across all stores.
    // Merchants only see it when they turn on the Analytics feature.
    await prisma.analyticsEvent.create({ data: { storeId: store.id, ...body } });
    res.status(202).json({ ok: true });
  }),
);
