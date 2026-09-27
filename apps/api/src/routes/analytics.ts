import { Router } from "express";
import { asyncHandler } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchant, requireModule } from "../middleware/auth";

export const analyticsRouter = Router();
analyticsRouter.use(...merchant, requireModule("analytics"));

// Days are counted in Sri Lanka time so "today" matches the merchant's day.
const TZ = "Asia/Colombo";

analyticsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const storeId = req.store!.id;
    const since = new Date(Date.now() - days * 86_400_000);
    // Orders that count as sales: everything placed except cancellations.
    const orderWhere = { storeId, createdAt: { gte: since }, status: { not: "cancelled" } };

    const [daily, totals, visits, funnel, topProducts, byDistrict] = await Promise.all([
      prisma.$queryRaw<Array<{ day: string; orders: bigint; sales: bigint | null }>>`
        SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}), 'YYYY-MM-DD') AS day,
               COUNT(*) AS orders, SUM("totalCents") AS sales
        FROM "Order"
        WHERE "storeId" = ${storeId} AND "createdAt" >= ${since} AND status <> 'cancelled'
        GROUP BY 1 ORDER BY 1`,
      prisma.order.aggregate({ where: orderWhere, _count: { _all: true }, _sum: { totalCents: true, discountCents: true } }),
      prisma.$queryRaw<Array<{ day: string; visitors: bigint; views: bigint }>>`
        SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}), 'YYYY-MM-DD') AS day,
               COUNT(DISTINCT "sessionId") AS visitors, COUNT(*) FILTER (WHERE type = 'page_view') AS views
        FROM "AnalyticsEvent"
        WHERE "storeId" = ${storeId} AND "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<Array<{ type: string; sessions: bigint }>>`
        SELECT type, COUNT(DISTINCT "sessionId") AS sessions
        FROM "AnalyticsEvent"
        WHERE "storeId" = ${storeId} AND "createdAt" >= ${since}
        GROUP BY type`,
      prisma.$queryRaw<Array<{ name: string; units: bigint; sales: bigint }>>`
        SELECT i."productName" AS name, SUM(i.quantity) AS units, SUM(i.quantity * i."unitPriceCents") AS sales
        FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
        WHERE o."storeId" = ${storeId} AND o."createdAt" >= ${since} AND o.status <> 'cancelled'
        GROUP BY 1 ORDER BY sales DESC LIMIT 5`,
      prisma.$queryRaw<Array<{ district: string | null; orders: bigint; sales: bigint }>>`
        SELECT a.district, COUNT(*) AS orders, SUM(o."totalCents") AS sales
        FROM "Order" o JOIN "ShippingAddress" a ON a."orderId" = o.id
        WHERE o."storeId" = ${storeId} AND o."createdAt" >= ${since} AND o.status <> 'cancelled'
        GROUP BY 1 ORDER BY sales DESC LIMIT 8`,
    ]);

    // One entry per calendar day, including days with nothing, so charts don't skip gaps.
    const byDay = new Map(daily.map((d) => [d.day, d]));
    const visitsByDay = new Map(visits.map((v) => [v.day, v]));
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    const series = Array.from({ length: days }, (_, i) => {
      const day = fmt.format(new Date(Date.now() - (days - 1 - i) * 86_400_000));
      return {
        day,
        orders: Number(byDay.get(day)?.orders ?? 0),
        salesCents: Number(byDay.get(day)?.sales ?? 0),
        visitors: Number(visitsByDay.get(day)?.visitors ?? 0),
      };
    });

    const orderCount = totals._count._all;
    const sessions = (type: string) => Number(funnel.find((f) => f.type === type)?.sessions ?? 0);
    const visitors = series.reduce((n, d) => n + d.visitors, 0);

    res.json({
      days,
      currency: req.store!.currency,
      summary: {
        salesCents: totals._sum.totalCents ?? 0,
        orders: orderCount,
        averageOrderCents: orderCount ? Math.round((totals._sum.totalCents ?? 0) / orderCount) : 0,
        discountsCents: totals._sum.discountCents ?? 0,
        visitors,
        conversionRate: visitors ? orderCount / visitors : null,
      },
      series,
      funnel: [
        { step: "Visited the store", sessions: sessions("page_view") },
        { step: "Viewed a product", sessions: sessions("product_view") },
        { step: "Added to cart", sessions: sessions("add_to_cart") },
        { step: "Started checkout", sessions: sessions("checkout_start") },
        { step: "Placed an order", sessions: orderCount },
      ],
      topProducts: topProducts.map((p) => ({ name: p.name, units: Number(p.units), salesCents: Number(p.sales) })),
      byDistrict: byDistrict.map((d) => ({ district: d.district ?? "Not given", orders: Number(d.orders), salesCents: Number(d.sales) })),
    });
  }),
);
