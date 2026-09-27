import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { isTemplateKey, TEMPLATE_KEYS, type TemplateKey } from "@repo/core";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth, signToken } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import { applyTemplate, storeSlugProblem } from "../services/stores";

export const authRouter = Router();

// Slows password guessing; generous enough for people mistyping.
const authLimit = rateLimit({ windowMs: 15 * 60_000, max: 20 });

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  storeName: z.string().trim().min(2).max(80),
  storeSlug: z.string().trim().toLowerCase(),
  templateKey: z.string().refine(isTemplateKey, `Choose one of ${TEMPLATE_KEYS.join(", ")}`).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

function publicUser(user: { id: string; email: string; firstName: string | null; lastName: string | null }) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
}

authRouter.post(
  "/register",
  authLimit,
  asyncHandler(async (req, res) => {
    const body = parseBody(registerSchema, req.body);
    const slugProblem = storeSlugProblem(body.storeSlug);
    if (slugProblem) throw new HttpError(400, slugProblem);

    const [emailTaken, slugTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email: body.email }, select: { id: true } }),
      prisma.store.findUnique({ where: { slug: body.storeSlug }, select: { id: true } }),
    ]);
    if (emailTaken) throw new HttpError(409, "That email is already registered");
    if (slugTaken) throw new HttpError(409, "That store address is taken");

    const password = await bcrypt.hash(body.password, 12);
    const { user, store } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: body.email, password, firstName: body.firstName, lastName: body.lastName },
      });
      const created = await tx.store.create({
        data: { name: body.storeName, slug: body.storeSlug, ownerId: user.id, email: body.email },
      });
      await applyTemplate(tx, created.id, (body.templateKey as TemplateKey) ?? "classic", { replacePages: true });
      const store = await tx.store.findUniqueOrThrow({ where: { id: created.id }, include: { theme: true } });
      return { user, store };
    });

    res.status(201).json({ user: publicUser(user), store, token: signToken(user) });
  }),
);

authRouter.post(
  "/login",
  authLimit,
  asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { stores: { include: { theme: true }, orderBy: { createdAt: "asc" }, take: 1 } },
    });
    // Compare even when the user doesn't exist so response timing doesn't reveal registered emails.
    const hash = user?.password ?? "$2a$12$DY5W0iv70gKDKqYAus310.FaniUZ24nuyVFGcgclUx588XOFPa2Di";
    const ok = await bcrypt.compare(body.password, hash);
    if (!user || !ok) throw new HttpError(401, "Invalid email or password");

    res.json({ user: publicUser(user), store: user.stores[0] ?? null, token: signToken(user) });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { stores: { include: { theme: true }, orderBy: { createdAt: "asc" }, take: 1 } },
    });
    if (!user) throw new HttpError(404, "User not found");
    res.json({ user: publicUser(user), store: user.stores[0] ?? null });
  }),
);
