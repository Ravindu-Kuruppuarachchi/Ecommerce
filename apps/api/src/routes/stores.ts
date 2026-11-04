import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  adminNav,
  dependents,
  effectiveModules,
  HOME_PAGE_SLUG,
  BUTTON_STYLES,
  CORNER_STYLES,
  IMAGE_RATIOS,
  isFontName,
  normalizeThemeSettings,
  isModuleKey,
  isTemplateKey,
  missingRequirements,
  MODULE_KEYS,
  MODULES,
  TEMPLATES,
  TEMPLATE_KEYS,
  validateSections,
  type TemplateKey,
} from "@repo/core";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchant } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import { activeModules } from "../services/modules";
import { applyTemplate, slugify } from "../services/stores";

// ============ TEMPLATES (public catalog) ============

export const templatesRouter = Router();

templatesRouter.get("/", (_req, res) => {
  res.json(
    TEMPLATE_KEYS.map((key) => {
      const { name, description, bestFor, theme, pages } = TEMPLATES[key];
      return { key, name, description, bestFor, theme, pages: pages.map((p) => ({ slug: p.slug, title: p.title })) };
    }),
  );
});

// ============ MERCHANT: /api/stores/me ============

export const myStoreRouter = Router();
myStoreRouter.use(...merchant);

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a hex color like #1a2b3c");
const httpsUrl = z.string().url().refine((u) => /^https?:\/\//.test(u), "Must be an http(s) link");

const storeUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().max(1000).nullable().optional(),
  logo: httpsUrl.nullable().optional(),
  favicon: httpsUrl.nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  taxBps: z.number().int().min(0).max(5000).optional(),
  // "suspended" is set by platform admins only.
  status: z.enum(["draft", "live"]).optional(),
  lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
});

const themeUpdateSchema = z.object({
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  fontFamily: z.string().refine(isFontName, "Pick one of the available fonts").optional(),
  headerStyle: z.enum(["minimal", "standard", "premium"]).optional(),
  settings: z
    .object({
      corners: z.enum(CORNER_STYLES),
      buttons: z.enum(BUTTON_STYLES),
      imageRatio: z.enum(IMAGE_RATIOS),
      quickAdd: z.boolean(),
    })
    .partial()
    .optional(),
});

myStoreRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const [store, productCount, home] = await Promise.all([
      prisma.store.findUniqueOrThrow({ where: { id: req.store!.id }, include: { theme: true, domains: true } }),
      prisma.product.count({ where: { storeId: req.store!.id, status: "active" } }),
      prisma.storePage.findUnique({
        where: { storeId_slug: { storeId: req.store!.id, slug: HOME_PAGE_SLUG } },
        select: { createdAt: true, publishedAt: true },
      }),
    ]);
    // Drives the dashboard's launch checklist.
    const setup = {
      productCount,
      homeCustomized: Boolean(home?.publishedAt && home.publishedAt.getTime() - home.createdAt.getTime() > 1000),
      hasLogo: Boolean(store.logo),
    };
    res.json({ ...store, setup });
  }),
);

myStoreRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(storeUpdateSchema, req.body);
    if (data.status && req.store!.status === "suspended") throw new HttpError(403, "This store is suspended. Contact support.");
    const store = await prisma.store.update({ where: { id: req.store!.id }, data, include: { theme: true } });
    res.json(store);
  }),
);

myStoreRouter.patch(
  "/theme",
  asyncHandler(async (req, res) => {
    const { settings: patch, ...data } = parseBody(themeUpdateSchema, req.body);
    // Settings merge over what's stored, so the dashboard can change one at a time.
    const current = await prisma.storeTheme.findUnique({ where: { storeId: req.store!.id }, select: { settings: true } });
    const settings = normalizeThemeSettings({ ...normalizeThemeSettings(current?.settings), ...patch }) as unknown as Prisma.InputJsonValue;
    const theme = await prisma.storeTheme.upsert({
      where: { storeId: req.store!.id },
      create: { storeId: req.store!.id, ...data, settings },
      update: { ...data, settings },
    });
    res.json(theme);
  }),
);

myStoreRouter.post(
  "/template",
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        key: z.string().refine(isTemplateKey, "Unknown template"),
        // Overwrites pages the template also defines; leave false to only restyle and add missing pages.
        replacePages: z.boolean().default(false),
      }),
      req.body,
    );
    await prisma.$transaction((tx) => applyTemplate(tx, req.store!.id, body.key as TemplateKey, { replacePages: body.replacePages }));
    const store = await prisma.store.findUniqueOrThrow({ where: { id: req.store!.id }, include: { theme: true } });
    res.json(store);
  }),
);

// ---- Feature modules ----

async function enabledModuleKeys(storeId: string): Promise<string[]> {
  const rows = await prisma.storeModule.findMany({ where: { storeId, enabled: true }, select: { key: true } });
  return rows.map((r) => r.key);
}

async function modulesResponse(storeId: string) {
  const enabled = await enabledModuleKeys(storeId);
  const active = new Set(effectiveModules(enabled));
  return {
    modules: MODULE_KEYS.map((key) => {
      const { label, description, core, requires, available } = MODULES[key];
      return { key, label, description, core, requires, available, enabled: active.has(key) };
    }),
    nav: adminNav(enabled),
  };
}

myStoreRouter.get(
  "/modules",
  asyncHandler(async (req, res) => {
    res.json(await modulesResponse(req.store!.id));
  }),
);

myStoreRouter.put(
  "/modules/:key",
  asyncHandler(async (req, res) => {
    const { key } = req.params;
    if (!isModuleKey(key)) throw new HttpError(404, "Unknown module");
    const { enabled } = parseBody(z.object({ enabled: z.boolean() }), req.body);
    const def = MODULES[key];
    if (def.core) throw new HttpError(400, `${def.label} is always on`);
    if (enabled && !def.available) throw new HttpError(400, `${def.label} isn't available yet`);

    const current = await enabledModuleKeys(req.store!.id);
    if (enabled) {
      const missing = missingRequirements(key, current);
      if (missing.length) throw new HttpError(409, `Turn on ${missing.map((m) => MODULES[m].label).join(", ")} first`);
    } else {
      const blocking = dependents(key, current);
      if (blocking.length) throw new HttpError(409, `Turn off ${blocking.map((m) => MODULES[m].label).join(", ")} first`);
      if (key === "inventory" && (await prisma.productVariant.count({ where: { product: { storeId: req.store!.id } } })) > 0) {
        throw new HttpError(409, "Some products have variants. Remove their options before turning off Inventory.");
      }
    }

    await prisma.storeModule.upsert({
      where: { storeId_key: { storeId: req.store!.id, key } },
      create: { storeId: req.store!.id, key, enabled },
      update: { enabled },
    });
    res.json(await modulesResponse(req.store!.id));
  }),
);

// ---- Pages (section builder) ----

const pageSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/, "Use lowercase letters, numbers and hyphens");

function sectionsOrThrow(input: unknown): Prisma.InputJsonValue {
  const result = validateSections(input);
  if (!result.ok) throw new HttpError(400, "Some sections are invalid", result.errors);
  return result.sections as unknown as Prisma.InputJsonValue;
}

async function findPage(storeId: string, slug: string) {
  const page = await prisma.storePage.findUnique({ where: { storeId_slug: { storeId, slug } } });
  if (!page) throw new HttpError(404, "Page not found");
  return page;
}

myStoreRouter.get(
  "/pages",
  asyncHandler(async (req, res) => {
    const pages = await prisma.storePage.findMany({
      where: { storeId: req.store!.id },
      select: { id: true, slug: true, title: true, publishedAt: true, updatedAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(pages);
  }),
);

myStoreRouter.post(
  "/pages",
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({ title: z.string().trim().min(1).max(80), slug: pageSlugSchema.optional(), sections: z.unknown().default([]) }),
      req.body,
    );
    const slug = body.slug ?? slugify(body.title);
    try {
      const page = await prisma.storePage.create({
        data: { storeId: req.store!.id, slug, title: body.title, draftSections: sectionsOrThrow(body.sections) },
      });
      res.status(201).json(page);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "A page with that address already exists");
      }
      throw error;
    }
  }),
);

myStoreRouter.get(
  "/pages/:slug",
  asyncHandler(async (req, res) => {
    res.json(await findPage(req.store!.id, req.params.slug));
  }),
);

/** Saves the draft. Customers keep seeing the published version until /publish. */
myStoreRouter.put(
  "/pages/:slug",
  asyncHandler(async (req, res) => {
    const page = await findPage(req.store!.id, req.params.slug);
    const body = parseBody(z.object({ title: z.string().trim().min(1).max(80).optional(), sections: z.unknown() }), req.body);
    const updated = await prisma.storePage.update({
      where: { id: page.id },
      data: { title: body.title, draftSections: sectionsOrThrow(body.sections) },
    });
    res.json(updated);
  }),
);

myStoreRouter.post(
  "/pages/:slug/publish",
  asyncHandler(async (req, res) => {
    const page = await findPage(req.store!.id, req.params.slug);
    const updated = await prisma.storePage.update({
      where: { id: page.id },
      data: { publishedSections: page.draftSections ?? [], publishedAt: new Date() },
    });
    res.json(updated);
  }),
);

myStoreRouter.delete(
  "/pages/:slug",
  asyncHandler(async (req, res) => {
    if (req.params.slug === HOME_PAGE_SLUG) throw new HttpError(400, "The home page can't be deleted");
    const page = await findPage(req.store!.id, req.params.slug);
    await prisma.storePage.delete({ where: { id: page.id } });
    res.json({ success: true });
  }),
);

// ============ PUBLIC STOREFRONT: /api/stores/:slug ============

export const publicStoreRouter = Router();

const publicStoreSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logo: true,
  favicon: true,
  currency: true,
  taxBps: true,
  theme: true,
  pages: { where: { publishedAt: { not: null } }, select: { slug: true, title: true } },
} satisfies Prisma.StoreSelect;

async function findPublicStore(where: Prisma.StoreWhereUniqueInput) {
  const store = await prisma.store.findUnique({ where, select: { ...publicStoreSelect, status: true } });
  if (!store || store.status === "suspended") throw new HttpError(404, "Store not found");
  const modules = await activeModules(store.id);
  // Draft stores are viewable (so owners can preview them) but can't take orders.
  return {
    ...store,
    features: { shipping: modules.has("shipping"), discounts: modules.has("discounts"), analytics: modules.has("analytics") },
  };
}

/** Resolves a custom domain to its store; the storefront middleware calls this for non-platform hosts. */
publicStoreRouter.get(
  "/by-host/:host",
  asyncHandler(async (req, res) => {
    const hostname = req.params.host.toLowerCase().replace(/:\d+$/, "");
    const domain = await prisma.domain.findUnique({ where: { hostname }, select: { status: true, store: { select: { slug: true } } } });
    if (!domain || domain.status !== "active") throw new HttpError(404, "Unknown domain");
    res.json({ slug: domain.store.slug });
  }),
);

publicStoreRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    res.json(await findPublicStore({ slug: req.params.slug }));
  }),
);

publicStoreRouter.get(
  "/:slug/pages/:pageSlug",
  asyncHandler(async (req, res) => {
    const store = await findPublicStore({ slug: req.params.slug });
    const page = await prisma.storePage.findUnique({
      where: { storeId_slug: { storeId: store.id, slug: req.params.pageSlug } },
      select: { slug: true, title: true, publishedSections: true, publishedAt: true },
    });
    if (!page?.publishedAt) throw new HttpError(404, "Page not found");
    res.json({ slug: page.slug, title: page.title, sections: page.publishedSections });
  }),
);

publicStoreRouter.post(
  "/:slug/subscribers",
  rateLimit({ windowMs: 10 * 60_000, max: 10 }),
  asyncHandler(async (req, res) => {
    const store = await findPublicStore({ slug: req.params.slug });
    const { email } = parseBody(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
    await prisma.newsletterSubscriber.upsert({
      where: { storeId_email: { storeId: store.id, email } },
      create: { storeId: store.id, email },
      update: {},
    });
    // Same response whether or not they were already subscribed.
    res.status(201).json({ subscribed: true });
  }),
);
