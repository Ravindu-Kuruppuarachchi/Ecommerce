import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod/v3";
import { env } from "../lib/env";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchant } from "../middleware/auth";
import { changeStock } from "../services/inventory";
import { activeModules } from "../services/modules";
import { slugify } from "../services/stores";
import { syncVariants, validateVariants } from "../services/variants";

export const productsRouter = Router();

import { moneyInput as price } from "../lib/validation";

const imageSchema = z.object({
  // Plain http is only allowed in development, where uploads are served from localhost.
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://") || (!env.isProduction && u.startsWith("http://")), "Images must use https"),
  alt: z.string().max(200).optional(),
});

const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(10_000).nullable().optional(),
  price,
  compareAtPrice: price.nullable().optional(),
  quantity: z.coerce.number().int().min(0).max(1_000_000).default(0),
  category: z.string().trim().max(60).nullable().optional(),
  sku: z.string().trim().max(60).nullable().optional(),
  status: z.enum(["draft", "active", "archived"]).default("active"),
  images: z.array(imageSchema).max(12).optional(),
  // Variants need the Inventory module. Sending options replaces the variant list.
  options: z
    .array(z.object({ name: z.string().trim().min(1).max(30), values: z.array(z.string().trim().min(1).max(30)).min(1).max(30) }))
    .max(3)
    .optional(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        optionValues: z.record(z.string().max(30), z.string().max(30)),
        sku: z.string().trim().max(60).nullable().optional(),
        price: price.nullable().optional(),
        quantity: z.coerce.number().int().min(0).max(1_000_000),
      }),
    )
    .max(100)
    .optional(),
});

function toData(input: Partial<z.infer<typeof productSchema>>) {
  const { price: priceCents, compareAtPrice, images: _images, options: _options, variants: _variants, quantity: _quantity, ...rest } = input;
  return {
    ...rest,
    ...(priceCents !== undefined && { priceCents }),
    ...(compareAtPrice !== undefined && { compareAtPriceCents: compareAtPrice }),
  };
}

function imageRows(images: z.infer<typeof imageSchema>[]) {
  return images.map((img, position) => ({ ...img, position }));
}

const withImages = {
  images: { orderBy: { position: "asc" } },
  variants: { orderBy: { position: "asc" } },
} satisfies Prisma.ProductInclude;

type ProductBody = Partial<z.infer<typeof productSchema>>;

/** Variant inputs from the request, after checking the store may use them. */
async function variantPlan(storeId: string, body: ProductBody) {
  if (body.options === undefined) return null;
  const variants = (body.variants ?? []).map((v) => ({ ...v, priceCents: v.price ?? null }));
  if (body.options.length && !(await activeModules(storeId)).has("inventory")) {
    throw new HttpError(403, "Turn on the Inventory feature to sell products in variants");
  }
  validateVariants(body.options, variants);
  return { options: body.options, variants };
}

async function uniqueProductSlug(storeId: string, name: string): Promise<string> {
  const base = slugify(name);
  const taken = await prisma.product.findMany({
    where: { storeId, slug: { startsWith: base } },
    select: { slug: true },
  });
  const used = new Set(taken.map((p) => p.slug));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

async function findOwnProduct(storeId: string, id: string) {
  const product = await prisma.product.findFirst({ where: { id, storeId } });
  if (!product) throw new HttpError(404, "Product not found");
  return product;
}

// ============ MERCHANT ============

productsRouter.get(
  "/",
  ...merchant,
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      where: { storeId: req.store!.id },
      include: withImages,
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  }),
);

productsRouter.post(
  "/",
  ...merchant,
  asyncHandler(async (req, res) => {
    const body = parseBody(productSchema, req.body);
    const storeId = req.store!.id;
    const plan = await variantPlan(storeId, body);
    const slug = await uniqueProductSlug(storeId, body.name);
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...toData(body),
          name: body.name,
          priceCents: body.price,
          storeId,
          slug,
          options: (plan?.options ?? []) as Prisma.InputJsonValue,
          images: { create: imageRows(body.images ?? []) },
        },
      });
      if (plan?.options.length) await syncVariants(tx, storeId, created.id, plan.options, plan.variants);
      else if (body.quantity) await changeStock(tx, { storeId, productId: created.id, change: body.quantity, reason: "restock", note: "Initial stock" });
      return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: withImages });
    });
    res.status(201).json(product);
  }),
);

productsRouter.get(
  "/:id",
  ...merchant,
  asyncHandler(async (req, res) => {
    await findOwnProduct(req.store!.id, req.params.id);
    res.json(await prisma.product.findUnique({ where: { id: req.params.id }, include: withImages }));
  }),
);

productsRouter.patch(
  "/:id",
  ...merchant,
  asyncHandler(async (req, res) => {
    const product = await findOwnProduct(req.store!.id, req.params.id);
    const body = parseBody(productSchema.partial(), req.body);
    const storeId = req.store!.id;
    const plan = await variantPlan(storeId, body);
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.product.update({
        where: { id: product.id },
        data: {
          ...toData(body),
          ...(plan && { options: plan.options as Prisma.InputJsonValue }),
          // Sending images replaces the whole set, in the order given.
          ...(body.images && { images: { deleteMany: {}, create: imageRows(body.images) } }),
        },
      });
      if (plan) await syncVariants(tx, storeId, product.id, plan.options, plan.variants);
      // Stock edits from the product form go through the log like any other change.
      if (body.quantity !== undefined && body.quantity !== current.quantity) {
        await changeStock(tx, { storeId, productId: product.id, change: body.quantity - current.quantity, reason: "correction", note: "Edited on the product page" });
      }
      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: withImages });
    });
    res.json(updated);
  }),
);

productsRouter.delete(
  "/:id",
  ...merchant,
  asyncHandler(async (req, res) => {
    const product = await findOwnProduct(req.store!.id, req.params.id);
    await prisma.product.delete({ where: { id: product.id } });
    res.json({ success: true });
  }),
);

// ============ PUBLIC STOREFRONT ============

async function storeIdForSlug(slug: string): Promise<string> {
  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!store || store.status === "suspended") throw new HttpError(404, "Store not found");
  return store.id;
}

// Only what the storefront renders; internal fields like sku and status stay private.
const publicProductSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  priceCents: true,
  compareAtPriceCents: true,
  quantity: true,
  category: true,
  images: { orderBy: { position: "asc" }, select: { url: true, alt: true } },
  options: true,
  variants: { orderBy: { position: "asc" }, select: { id: true, title: true, optionValues: true, priceCents: true, quantity: true } },
} satisfies Prisma.ProductSelect;

productsRouter.get(
  "/store/:slug",
  asyncHandler(async (req, res) => {
    const storeId = await storeIdForSlug(req.params.slug);
    const { category } = req.query;
    const limit = parseBody(z.coerce.number().int().min(1).max(100), req.query.limit ?? 100);
    const products = await prisma.product.findMany({
      where: { storeId, status: "active", ...(typeof category === "string" && category && { category: { equals: category, mode: "insensitive" as const } }) },
      select: publicProductSelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.json(products);
  }),
);

productsRouter.get(
  "/store/:slug/search",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim().slice(0, 100);
    if (!q) throw new HttpError(400, "Search query required");
    const storeId = await storeIdForSlug(req.params.slug);
    const products = await prisma.product.findMany({
      where: {
        storeId,
        status: "active",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      },
      select: publicProductSelect,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(products);
  }),
);

productsRouter.get(
  "/store/:slug/:productSlug",
  asyncHandler(async (req, res) => {
    const storeId = await storeIdForSlug(req.params.slug);
    const product = await prisma.product.findFirst({
      where: { storeId, slug: req.params.productSlug, status: "active" },
      select: publicProductSelect,
    });
    if (!product) throw new HttpError(404, "Product not found");

    const relatedProducts = await prisma.product.findMany({
      where: { storeId, status: "active", id: { not: product.id }, ...(product.category && { category: product.category }) },
      select: publicProductSelect,
      take: 4,
    });
    res.json({ product, relatedProducts });
  }),
);
