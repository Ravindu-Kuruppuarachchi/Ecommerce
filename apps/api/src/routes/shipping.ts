import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod/v3";
import { isDistrict } from "@repo/core";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchant, requireModule } from "../middleware/auth";

export const shippingRouter = Router();
shippingRouter.use(...merchant, requireModule("shipping"));

import { moneyInput as money } from "../lib/validation";

const zoneSchema = z.object({
  name: z.string().trim().min(1).max(60),
  districts: z.array(z.string().refine(isDistrict, "Unknown district")).min(1, "Pick at least one district"),
  rate: money,
  freeOver: money.nullable().optional(),
  estimatedDays: z.string().trim().max(40).nullable().optional(),
});

function toData(body: z.infer<typeof zoneSchema>) {
  return {
    name: body.name,
    districts: [...new Set(body.districts)],
    rateCents: body.rate,
    freeOverCents: body.freeOver ?? null,
    estimatedDays: body.estimatedDays || null,
  };
}

/** A district can only belong to one zone, or the delivery fee would be ambiguous. */
async function assertNoOverlap(tx: Prisma.TransactionClient, storeId: string, districts: string[], exceptId?: string) {
  const others = await tx.shippingZone.findMany({ where: { storeId, ...(exceptId && { id: { not: exceptId } }) } });
  for (const zone of others) {
    const clash = zone.districts.filter((d) => districts.includes(d));
    if (clash.length) throw new HttpError(409, `${clash.join(", ")} ${clash.length === 1 ? "is" : "are"} already in "${zone.name}"`);
  }
}

shippingRouter.get(
  "/zones",
  asyncHandler(async (req, res) => {
    res.json(await prisma.shippingZone.findMany({ where: { storeId: req.store!.id }, orderBy: { position: "asc" } }));
  }),
);

shippingRouter.post(
  "/zones",
  asyncHandler(async (req, res) => {
    const data = toData(parseBody(zoneSchema, req.body));
    const zone = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${req.store!.id} FOR UPDATE`;
      await assertNoOverlap(tx, req.store!.id, data.districts);
      const position = await tx.shippingZone.count({ where: { storeId: req.store!.id } });
      return tx.shippingZone.create({ data: { ...data, storeId: req.store!.id, position } });
    });
    res.status(201).json(zone);
  }),
);

shippingRouter.put(
  "/zones/:id",
  asyncHandler(async (req, res) => {
    const zone = await prisma.shippingZone.findFirst({ where: { id: req.params.id, storeId: req.store!.id } });
    if (!zone) throw new HttpError(404, "Zone not found");
    const data = toData(parseBody(zoneSchema, req.body));
    const updated = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${req.store!.id} FOR UPDATE`;
      await assertNoOverlap(tx, req.store!.id, data.districts, zone.id);
      return tx.shippingZone.update({ where: { id: zone.id }, data });
    });
    res.json(updated);
  }),
);

shippingRouter.delete(
  "/zones/:id",
  asyncHandler(async (req, res) => {
    const deleted = await prisma.shippingZone.deleteMany({ where: { id: req.params.id, storeId: req.store!.id } });
    if (deleted.count === 0) throw new HttpError(404, "Zone not found");
    res.json({ success: true });
  }),
);
