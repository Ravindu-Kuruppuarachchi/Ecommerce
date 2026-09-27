import { Router } from "express";
import { asyncHandler } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchant } from "../middleware/auth";

// Merchant-facing money views: dashboard numbers and the payout balance.
// Auth is per route because this router is mounted at /api and must not swallow unknown paths.
export const financeRouter = Router();

financeRouter.get(
  "/dashboard/stats",
  ...merchant,
  asyncHandler(async (req, res) => {
    const storeId = req.store!.id;
    const [totalProducts, totalOrders, lowStock, paid] = await Promise.all([
      prisma.product.count({ where: { storeId, status: { not: "archived" } } }),
      prisma.order.count({ where: { storeId } }),
      prisma.product.count({ where: { storeId, status: "active", quantity: { lt: 10 } } }),
      prisma.order.aggregate({
        where: { storeId, paymentStatus: "paid" },
        _sum: { totalCents: true, platformFeeCents: true },
      }),
    ]);
    res.json({
      currency: req.store!.currency,
      totalProducts,
      totalOrders,
      lowStock,
      revenueCents: paid._sum.totalCents ?? 0,
      platformFeesCents: paid._sum.platformFeeCents ?? 0,
    });
  }),
);

/**
 * Balance > 0: the platform owes the merchant (card sales awaiting payout).
 * Balance < 0: the merchant owes platform fees on cash-on-delivery orders.
 */
financeRouter.get(
  "/payouts/balance",
  ...merchant,
  asyncHandler(async (req, res) => {
    const storeId = req.store!.id;
    const [balance, recent, payouts] = await Promise.all([
      prisma.ledgerEntry.aggregate({ where: { storeId }, _sum: { amountCents: true } }),
      prisma.ledgerEntry.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, type: true, amountCents: true, memo: true, createdAt: true, order: { select: { orderNumber: true } } },
      }),
      prisma.payout.findMany({ where: { storeId }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    res.json({ currency: req.store!.currency, balanceCents: balance._sum.amountCents ?? 0, entries: recent, payouts });
  }),
);
