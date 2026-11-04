import { Router } from "express";
import { asyncHandler } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchant, requireModule } from "../middleware/auth";

export const customersRouter = Router();
customersRouter.use(...merchant, requireModule("customers"));

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const storeId = req.store!.id;
    const [customers, orderCounts, spend, subscriberCount] = await Promise.all([
      prisma.customer.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true },
      }),
      prisma.order.groupBy({ by: ["customerId"], where: { storeId }, _count: { _all: true } }),
      // Spend counts paid orders only.
      prisma.order.groupBy({ by: ["customerId"], where: { storeId, paymentStatus: "paid" }, _sum: { totalCents: true } }),
      prisma.newsletterSubscriber.count({ where: { storeId } }),
    ]);
    const orderCount = new Map(orderCounts.map((t) => [t.customerId, t._count._all]));
    const spent = new Map(spend.map((t) => [t.customerId, t._sum.totalCents ?? 0]));
    res.json({
      currency: req.store!.currency,
      subscriberCount,
      customers: customers.map((c) => ({ ...c, orderCount: orderCount.get(c.id) ?? 0, spentCents: spent.get(c.id) ?? 0 })),
    });
  }),
);
