import { Router } from "express";
import { z } from "zod/v3";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchant, requireModule } from "../middleware/auth";
import { changeStock } from "../services/inventory";

export const inventoryRouter = Router();
inventoryRouter.use(...merchant, requireModule("inventory"));

/** One row per stock-keeping unit: a product without variants, or each variant. */
inventoryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const threshold = req.store!.lowStockThreshold;
    const products = await prisma.product.findMany({
      where: { storeId: req.store!.id, status: { not: "archived" } },
      orderBy: { name: "asc" },
      include: { variants: { orderBy: { position: "asc" } }, images: { take: 1, orderBy: { position: "asc" } } },
    });
    type Row = { productId: string; productName: string; status: string; image: string | null; variantId: string | null; variantTitle: string | null; sku: string | null; quantity: number; low: boolean };
    const rows = products.flatMap((p): Row[] => {
      const base = { productId: p.id, productName: p.name, status: p.status, image: p.images[0]?.url ?? null };
      return p.variants.length
        ? p.variants.map((v) => ({ ...base, variantId: v.id, variantTitle: v.title, sku: v.sku ?? p.sku, quantity: v.quantity, low: v.quantity <= threshold }))
        : [{ ...base, variantId: null, variantTitle: null, sku: p.sku, quantity: p.quantity, low: p.quantity <= threshold }];
    });
    res.json({ threshold, rows });
  }),
);

inventoryRouter.post(
  "/adjust",
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).nullable().optional(),
        // "add" moves stock by amount (negative to remove); "set" sets an exact count.
        mode: z.enum(["add", "set"]),
        amount: z.number().int().min(-1_000_000).max(1_000_000),
        reason: z.enum(["restock", "correction", "damaged"]),
        note: z.string().trim().max(200).optional(),
      }),
      req.body,
    );
    const quantity = await prisma.$transaction(async tx => {
      // Lock the stock row before computing an absolute count's delta.
      if (body.variantId) {
        await tx.$queryRaw`SELECT v.id FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId" WHERE v.id = ${body.variantId} AND p.id = ${body.productId} AND p."storeId" = ${req.store!.id} FOR UPDATE OF v`;
      } else {
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${body.productId} AND "storeId" = ${req.store!.id} FOR UPDATE`;
      }
      const product = await tx.product.findFirst({ where: { id: body.productId, storeId: req.store!.id }, include: { variants: true } });
      if (!product) throw new HttpError(404, "Product not found");
      const variant = body.variantId ? product.variants.find(v => v.id === body.variantId) : null;
      if (body.variantId && !variant) throw new HttpError(404, "Variant not found");
      if (!variant && product.variants.length) throw new HttpError(400, "Adjust this product's stock per variant");
      if (body.mode === "set" && body.amount < 0) throw new HttpError(400, "Stock can't be negative");
      const current = variant?.quantity ?? product.quantity;
      const change = body.mode === "set" ? body.amount - current : body.amount;
      return change === 0 ? current : changeStock(tx, { storeId: req.store!.id, productId: product.id, variantId: variant?.id, change, reason: body.reason, note: body.note });
    });
    res.json({ quantity });
  }),
);

inventoryRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
    const history = await prisma.inventoryAdjustment.findMany({
      where: { storeId: req.store!.id, ...(productId && { productId }) },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        change: true,
        quantityAfter: true,
        reason: true,
        note: true,
        createdAt: true,
        product: { select: { name: true } },
        variant: { select: { title: true } },
      },
    });
    res.json(history);
  }),
);
