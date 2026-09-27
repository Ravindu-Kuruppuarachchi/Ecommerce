import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { toMinor } from "@repo/core";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchant } from "../middleware/auth";
import { slugify } from "../services/stores";

export const productsRouter = Router();

/** Prices arrive as what the merchant typed ("1250.50") and are stored in cents. */
const price = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const cents = toMinor(v);
    if (cents === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a price like 1250 or 1250.50" });
      return z.NEVER;
    }
    return cents;
  });

const imageSchema = z.object({
  url: z.string().url().refine((u) => u.startsWith("https://"), "Images must use https"),
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
});

function toData(input: Partial<z.infer<typeof productSchema>>) {
  const { price: priceCents, compareAtPrice, images: _images, ...rest } = input;
  return {
    ...rest,
    ...(priceCents !== undefined && { priceCents }),
    ...(compareAtPrice !== undefined && { compareAtPriceCents: compareAtPrice }),
  };
}

function imageRows(images: z.infer<typeof imageSchema>[]) {
  return images.map((img, position) => ({ ...img, position }));
}

const withImages = { images: { orderBy: { position: "asc" } } } satisfies Prisma.ProductInclude;

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
    const product = await prisma.product.create({
      data: {
        ...toData(body),
        name: body.name,
        priceCents: body.price,
        storeId: req.store!.id,
        slug: await uniqueProductSlug(req.store!.id, body.name),
        images: { create: imageRows(body.images ?? []) },
      },
      include: withImages,
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
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        ...toData(body),
        // Sending images replaces the whole set, in the order given.
        ...(body.images && { images: { deleteMany: {}, create: imageRows(body.images) } }),
      },
      include: withImages,
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
} satisfies Prisma.ProductSelect;

productsRouter.get(
  "/store/:slug",
  asyncHandler(async (req, res) => {
    const storeId = await storeIdForSlug(req.params.slug);
    const { category } = req.query;
    const limit = Math.min(Number(req.query.limit) || 100, 100);
    const products = await prisma.product.findMany({
      where: { storeId, status: "active", ...(typeof category === "string" && category && { category }) },
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
