import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { DISCOUNT_TYPES, toMinor } from "@repo/core";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchant, requireModule } from "../middleware/auth";

export const discountsRouter = Router();
discountsRouter.use(...merchant, requireModule("discounts"));

const moneyish = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const cents = toMinor(v);
  if (cents === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter an amount like 500 or 500.00" });
    return z.NEVER;
  }
  return cents;
});

const discountSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    // Omit for an automatic discount.
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, "Use 3-30 letters, numbers, - or _")
      .nullable()
      .optional(),
    type: z.enum(DISCOUNT_TYPES),
    /** Percent (e.g. "10" or "12.5") for percent discounts, an amount for fixed ones. */
    value: z.union([z.string(), z.number()]).optional(),
    minSubtotal: moneyish.optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    usageLimit: z.number().int().min(1).nullable().optional(),
    active: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    if (d.startsAt && d.endsAt && d.endsAt <= d.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End date must be after the start date" });
  });

function toData(d: z.infer<typeof discountSchema>) {
  let value = 0;
  if (d.type !== "free_shipping") {
    const cents = d.value === undefined ? null : toMinor(d.value);
    if (cents === null || cents <= 0) throw new HttpError(400, d.type === "percent" ? "Enter a percentage like 10" : "Enter an amount like 500");
    // toMinor turns "12.5" into 1250, which is exactly 12.5% in basis points.
    if (d.type === "percent" && cents > 10_000) throw new HttpError(400, "A percentage can't be more than 100");
    value = cents;
  }
  return {
    title: d.title,
    code: d.code || null,
    type: d.type,
    value,
    minSubtotalCents: d.minSubtotal ?? 0,
    startsAt: d.startsAt ?? null,
    endsAt: d.endsAt ?? null,
    usageLimit: d.usageLimit ?? null,
    active: d.active,
  };
}

const uniqueCode = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

discountsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const discounts = await prisma.discount.findMany({
      where: { storeId: req.store!.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    });
    res.json(discounts);
  }),
);

discountsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = toData(parseBody(discountSchema, req.body));
    try {
      res.status(201).json(await prisma.discount.create({ data: { ...data, storeId: req.store!.id } }));
    } catch (error) {
      if (uniqueCode(error)) throw new HttpError(409, "You already have a discount with that code");
      throw error;
    }
  }),
);

discountsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.discount.findFirst({ where: { id: req.params.id, storeId: req.store!.id } });
    if (!existing) throw new HttpError(404, "Discount not found");
    const data = toData(parseBody(discountSchema, req.body));
    try {
      res.json(await prisma.discount.update({ where: { id: existing.id }, data }));
    } catch (error) {
      if (uniqueCode(error)) throw new HttpError(409, "You already have a discount with that code");
      throw error;
    }
  }),
);

discountsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    // Past orders keep their discount snapshot (code, title, amount); the link is cleared.
    const deleted = await prisma.discount.deleteMany({ where: { id: req.params.id, storeId: req.store!.id } });
    if (deleted.count === 0) throw new HttpError(404, "Discount not found");
    res.json({ success: true });
  }),
);
