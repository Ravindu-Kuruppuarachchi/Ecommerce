import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { effectiveModules, formatMoney, HOME_PAGE_SLUG, MODULES, toMinor } from "@repo/core";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { platformAdmin } from "../middleware/auth";

// Platform staff views across every merchant store. Everything here is behind
// requirePlatformAdmin, and every change is written to AdminAuditLog.
export const platformRouter = Router();
platformRouter.use(...platformAdmin);

const TZ = "Asia/Colombo";
const DAY = 86_400_000;
/** A store owing more than this in COD fees is flagged. */
const FEE_ALERT_CENTS = 5_000_00;
/** A live store with past orders but none in this many days is flagged as gone quiet. */
const QUIET_DAYS = 14;

function rangeDays(value: unknown): number {
  return [7, 30, 90].includes(Number(value)) ? Number(value) : 30;
}

/** Calendar days (Sri Lanka time) from oldest to today, as YYYY-MM-DD. */
function dayList(days: number): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  return Array.from({ length: days }, (_, i) => fmt.format(new Date(Date.now() - (days - 1 - i) * DAY)));
}

const n = (v: bigint | number | null | undefined) => Number(v ?? 0);

/** Daily orders, sales, fees and visitors; optionally for one store. */
async function dailySeries(since: Date, days: number, storeId?: string) {
  const storeFilter = storeId ? Prisma.sql`AND "storeId" = ${storeId}` : Prisma.empty;
  const [orders, visits, signups] = await Promise.all([
    prisma.$queryRaw<Array<{ day: string; orders: bigint; sales: bigint; fees: bigint }>>`
      SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}), 'YYYY-MM-DD') AS day,
             COUNT(*) AS orders, SUM("totalCents") AS sales, SUM("platformFeeCents") AS fees
      FROM "Order" WHERE "createdAt" >= ${since} AND status <> 'cancelled' ${storeFilter}
      GROUP BY 1`,
    prisma.$queryRaw<Array<{ day: string; visitors: bigint }>>`
      SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}), 'YYYY-MM-DD') AS day,
             COUNT(DISTINCT "sessionId") AS visitors
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${since} ${storeFilter}
      GROUP BY 1`,
    storeId
      ? Promise.resolve([] as Array<{ day: string; signups: bigint }>)
      : prisma.$queryRaw<Array<{ day: string; signups: bigint }>>`
          SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}), 'YYYY-MM-DD') AS day, COUNT(*) AS signups
          FROM "Store" WHERE "createdAt" >= ${since} GROUP BY 1`,
  ]);
  const o = new Map(orders.map((r) => [r.day, r]));
  const v = new Map(visits.map((r) => [r.day, r]));
  const s = new Map(signups.map((r) => [r.day, r]));
  return dayList(days).map((day) => ({
    day,
    orders: n(o.get(day)?.orders),
    salesCents: n(o.get(day)?.sales),
    feesCents: n(o.get(day)?.fees),
    visitors: n(v.get(day)?.visitors),
    signups: n(s.get(day)?.signups),
  }));
}

interface StoreMetrics {
  orders: number;
  salesCents: number;
  feesCents: number;
  feesPaidCents: number;
  visitors: number;
}

/** Period metrics per store, keyed by store id. Stores with no activity are absent. */
async function metricsByStore(since: Date): Promise<Map<string, StoreMetrics>> {
  const [orders, paid, visits] = await Promise.all([
    prisma.order.groupBy({
      by: ["storeId"],
      where: { createdAt: { gte: since }, status: { not: "cancelled" } },
      _count: { _all: true },
      _sum: { totalCents: true, platformFeeCents: true },
    }),
    prisma.order.groupBy({
      by: ["storeId"],
      where: { createdAt: { gte: since }, status: { not: "cancelled" }, paymentStatus: "paid" },
      _sum: { platformFeeCents: true },
    }),
    prisma.$queryRaw<Array<{ storeId: string; visitors: bigint }>>`
      SELECT "storeId", COUNT(DISTINCT "sessionId") AS visitors FROM "AnalyticsEvent" WHERE "createdAt" >= ${since} GROUP BY 1`,
  ]);
  const map = new Map<string, StoreMetrics>();
  const get = (id: string) => {
    if (!map.has(id)) map.set(id, { orders: 0, salesCents: 0, feesCents: 0, feesPaidCents: 0, visitors: 0 });
    return map.get(id)!;
  };
  for (const r of orders) Object.assign(get(r.storeId), { orders: r._count._all, salesCents: r._sum.totalCents ?? 0, feesCents: r._sum.platformFeeCents ?? 0 });
  for (const r of paid) get(r.storeId).feesPaidCents = r._sum.platformFeeCents ?? 0;
  for (const r of visits) get(r.storeId).visitors = n(r.visitors);
  return map;
}

async function balancesByStore(): Promise<Map<string, number>> {
  const rows = await prisma.ledgerEntry.groupBy({ by: ["storeId"], _sum: { amountCents: true } });
  return new Map(rows.map((r) => [r.storeId, r._sum.amountCents ?? 0]));
}

async function lastOrderByStore(): Promise<Map<string, Date>> {
  const rows = await prisma.order.groupBy({ by: ["storeId"], _max: { createdAt: true } });
  return new Map(rows.filter((r) => r._max.createdAt).map((r) => [r.storeId, r._max.createdAt!]));
}

// ---- Overview ----

platformRouter.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const days = rangeDays(req.query.days);
    const since = new Date(Date.now() - days * DAY);

    const [series, metrics, balances, lastOrders, stores, productCounts, homePages] = await Promise.all([
      dailySeries(since, days),
      metricsByStore(since),
      balancesByStore(),
      lastOrderByStore(),
      prisma.store.findMany({ select: { id: true, name: true, slug: true, status: true, createdAt: true, owner: { select: { email: true } } } }),
      prisma.product.groupBy({ by: ["storeId"], where: { status: "active" }, _count: { _all: true } }),
      prisma.storePage.findMany({ where: { slug: HOME_PAGE_SLUG }, select: { storeId: true, createdAt: true, publishedAt: true } }),
    ]);

    const totals = [...metrics.values()].reduce(
      (t, m) => ({
        orders: t.orders + m.orders,
        salesCents: t.salesCents + m.salesCents,
        feesCents: t.feesCents + m.feesCents,
        feesPaidCents: t.feesPaidCents + m.feesPaidCents,
        visitors: t.visitors + m.visitors,
      }),
      { orders: 0, salesCents: 0, feesCents: 0, feesPaidCents: 0, visitors: 0 },
    );
    const balanceValues = [...balances.values()];
    const products = new Map(productCounts.map((p) => [p.storeId, p._count._all]));
    const customised = new Set(
      homePages.filter((p) => p.publishedAt && p.publishedAt.getTime() - p.createdAt.getTime() > 1000).map((p) => p.storeId),
    );

    // Onboarding funnel for stores that signed up in the period.
    const cohort = stores.filter((s) => s.createdAt >= since);
    const funnel = [
      { step: "Signed up", stores: cohort.length },
      { step: "Added a product", stores: cohort.filter((s) => (products.get(s.id) ?? 0) > 0).length },
      { step: "Customised home page", stores: cohort.filter((s) => customised.has(s.id)).length },
      { step: "Opened the store", stores: cohort.filter((s) => s.status === "live").length },
    ];

    const now = Date.now();
    const alerts = stores.flatMap((s) => {
      const out: Array<{ storeId: string; storeName: string; kind: string; message: string }> = [];
      const base = { storeId: s.id, storeName: s.name };
      const balance = balances.get(s.id) ?? 0;
      const last = lastOrders.get(s.id);
      if (s.status === "draft" && now - s.createdAt.getTime() > 7 * DAY) {
        out.push({ ...base, kind: "not_launched", message: `Signed up ${Math.floor((now - s.createdAt.getTime()) / DAY)} days ago and hasn't opened` });
      }
      if (s.status === "live" && (products.get(s.id) ?? 0) === 0) out.push({ ...base, kind: "no_products", message: "Open but has no active products" });
      if (s.status === "live" && last && now - last.getTime() > QUIET_DAYS * DAY) {
        out.push({ ...base, kind: "quiet", message: `No orders for ${Math.floor((now - last.getTime()) / DAY)} days` });
      }
      if (balance < -FEE_ALERT_CENTS) out.push({ ...base, kind: "owes_fees", message: `Owes ${formatMoney(-balance)} in platform fees` });
      return out;
    });

    res.json({
      days,
      summary: {
        ...totals,
        averageOrderCents: totals.orders ? Math.round(totals.salesCents / totals.orders) : 0,
        conversionRate: totals.visitors ? totals.orders / totals.visitors : null,
        stores: {
          total: stores.length,
          live: stores.filter((s) => s.status === "live").length,
          draft: stores.filter((s) => s.status === "draft").length,
          suspended: stores.filter((s) => s.status === "suspended").length,
          newInPeriod: cohort.length,
          withOrders: [...metrics.values()].filter((m) => m.orders > 0).length,
        },
        // Positive ledger balance: we hold the merchant's card money. Negative: they owe us COD fees.
        merchantsOweCents: -balanceValues.filter((b) => b < 0).reduce((a, b) => a + b, 0),
        weOweCents: balanceValues.filter((b) => b > 0).reduce((a, b) => a + b, 0),
      },
      series,
      funnel,
      alerts,
      feeAlertCents: FEE_ALERT_CENTS,
    });
  }),
);

// ---- Stores ----

platformRouter.get(
  "/stores",
  asyncHandler(async (req, res) => {
    const days = rangeDays(req.query.days);
    const since = new Date(Date.now() - days * DAY);
    const [stores, metrics, balances, lastOrders, productCounts] = await Promise.all([
      prisma.store.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, slug: true, status: true, templateKey: true, platformFeeBps: true, currency: true, createdAt: true,
          owner: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      metricsByStore(since),
      balancesByStore(),
      lastOrderByStore(),
      prisma.product.groupBy({ by: ["storeId"], where: { status: "active" }, _count: { _all: true } }),
    ]);
    const products = new Map(productCounts.map((p) => [p.storeId, p._count._all]));
    res.json({
      days,
      stores: stores.map((s) => {
        const m = metrics.get(s.id) ?? { orders: 0, salesCents: 0, feesCents: 0, feesPaidCents: 0, visitors: 0 };
        return {
          ...s,
          ...m,
          products: products.get(s.id) ?? 0,
          conversionRate: m.visitors ? m.orders / m.visitors : null,
          balanceCents: balances.get(s.id) ?? 0,
          lastOrderAt: lastOrders.get(s.id) ?? null,
        };
      }),
    });
  }),
);

async function findStore(id: string) {
  const store = await prisma.store.findUnique({
    where: { id },
    include: { owner: { select: { id: true, email: true, firstName: true, lastName: true, createdAt: true } }, domains: true, payoutAccount: true },
  });
  if (!store) throw new HttpError(404, "Store not found");
  return store;
}

platformRouter.get(
  "/stores/:id",
  asyncHandler(async (req, res) => {
    const days = rangeDays(req.query.days);
    const since = new Date(Date.now() - days * DAY);
    const store = await findStore(req.params.id);
    const [series, metrics, lifetime, balance, modules, productCount, recentOrders, ledger, payouts, audit] = await Promise.all([
      dailySeries(since, days, store.id),
      metricsByStore(since).then((m) => m.get(store.id) ?? { orders: 0, salesCents: 0, feesCents: 0, feesPaidCents: 0, visitors: 0 }),
      prisma.order.aggregate({ where: { storeId: store.id, status: { not: "cancelled" } }, _count: { _all: true }, _sum: { totalCents: true, platformFeeCents: true } }),
      prisma.ledgerEntry.aggregate({ where: { storeId: store.id }, _sum: { amountCents: true } }),
      prisma.storeModule.findMany({ where: { storeId: store.id, enabled: true }, select: { key: true } }),
      prisma.product.count({ where: { storeId: store.id, status: "active" } }),
      prisma.order.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, orderNumber: true, totalCents: true, platformFeeCents: true, status: true, paymentStatus: true, paymentMethod: true, createdAt: true },
      }),
      prisma.ledgerEntry.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, type: true, amountCents: true, memo: true, createdAt: true, order: { select: { orderNumber: true } } },
      }),
      prisma.payout.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.adminAuditLog.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { email: true } } },
      }),
    ]);
    res.json({
      days,
      store,
      modules: effectiveModules(modules.map((m) => m.key)).map((k) => ({ key: k, label: MODULES[k].label, core: MODULES[k].core })),
      productCount,
      period: { ...metrics, conversionRate: metrics.visitors ? metrics.orders / metrics.visitors : null },
      lifetime: { orders: lifetime._count._all, salesCents: lifetime._sum.totalCents ?? 0, feesCents: lifetime._sum.platformFeeCents ?? 0 },
      balanceCents: balance._sum.amountCents ?? 0,
      series,
      recentOrders,
      ledger,
      payouts,
      audit,
    });
  }),
);

// ---- Actions (all audited) ----

platformRouter.patch(
  "/stores/:id",
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z
        .object({
          status: z.enum(["draft", "live", "suspended"]).optional(),
          // Up to 30%. Applies to future orders only; past orders keep the rate they were placed at.
          platformFeeBps: z.number().int().min(0).max(3000).optional(),
          reason: z.string().trim().min(3, "Give a reason").max(500),
        })
        .refine((b) => b.status !== undefined || b.platformFeeBps !== undefined, "Nothing to change"),
      req.body,
    );
    const store = await findStore(req.params.id);
    const updated = await prisma.$transaction(async (tx) => {
      const audits: Prisma.AdminAuditLogCreateManyInput[] = [];
      if (body.status !== undefined && body.status !== store.status) {
        audits.push({
          actorId: req.user!.id,
          storeId: store.id,
          action: body.status === "suspended" ? "store.suspend" : "store.reactivate",
          details: { from: store.status, to: body.status, reason: body.reason },
        });
      }
      if (body.platformFeeBps !== undefined && body.platformFeeBps !== store.platformFeeBps) {
        audits.push({
          actorId: req.user!.id,
          storeId: store.id,
          action: "store.fee_rate",
          details: { fromBps: store.platformFeeBps, toBps: body.platformFeeBps, reason: body.reason },
        });
      }
      if (!audits.length) return store;
      await tx.adminAuditLog.createMany({ data: audits });
      return tx.store.update({ where: { id: store.id }, data: { status: body.status, platformFeeBps: body.platformFeeBps } });
    });
    res.json(updated);
  }),
);

/**
 * Records money moving outside the platform: a merchant paying the COD fees
 * they owe, or a bank transfer paying a merchant their card-sale balance.
 */
platformRouter.post(
  "/stores/:id/ledger",
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        kind: z.enum(["fee_payment", "payout"]),
        amount: z.union([z.string(), z.number()]),
        reference: z.string().trim().min(2, "Add the bank or receipt reference").max(120),
      }),
      req.body,
    );
    const amount = toMinor(body.amount);
    if (!amount || amount <= 0) throw new HttpError(400, "Enter an amount like 2500 or 2500.00");
    const store = await findStore(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      const balance = (await tx.ledgerEntry.aggregate({ where: { storeId: store.id }, _sum: { amountCents: true } }))._sum.amountCents ?? 0;
      const base = { storeId: store.id, currency: store.currency, key: `${body.kind}:${randomUUID()}` };
      if (body.kind === "fee_payment") {
        if (amount > -balance) throw new HttpError(409, balance < 0 ? "That's more than the store owes" : "This store doesn't owe any fees");
        await tx.ledgerEntry.create({ data: { ...base, type: "fee_payment", amountCents: amount, memo: `Fee payment received (${body.reference})` } });
      } else {
        if (amount > balance) throw new HttpError(409, balance > 0 ? "That's more than the store's balance" : "Nothing is owed to this store");
        const payout = await tx.payout.create({
          data: { storeId: store.id, amountCents: amount, currency: store.currency, status: "paid", reference: body.reference, paidAt: new Date() },
        });
        await tx.ledgerEntry.create({ data: { ...base, type: "payout", amountCents: -amount, payoutId: payout.id, memo: `Paid to bank (${body.reference})` } });
      }
      await tx.adminAuditLog.create({
        data: { actorId: req.user!.id, storeId: store.id, action: `ledger.${body.kind}`, details: { amountCents: amount, reference: body.reference, balanceBefore: balance } },
      });
      return (await tx.ledgerEntry.aggregate({ where: { storeId: store.id }, _sum: { amountCents: true } }))._sum.amountCents ?? 0;
    });
    res.status(201).json({ balanceCents: result });
  }),
);

platformRouter.get(
  "/audit",
  asyncHandler(async (_req, res) => {
    const entries = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { email: true } } },
    });
    const stores = await prisma.store.findMany({
      where: { id: { in: entries.map((e) => e.storeId).filter((id): id is string => Boolean(id)) } },
      select: { id: true, name: true },
    });
    const names = new Map(stores.map((s) => [s.id, s.name]));
    res.json(entries.map((e) => ({ ...e, storeName: e.storeId ? names.get(e.storeId) ?? "Deleted store" : null })));
  }),
);
