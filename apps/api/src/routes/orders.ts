import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError, parseBody } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchant } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import {
  FULFILLMENT_STATUSES,
  markCodOrderPaid,
  orderInclude,
  PAYMENT_METHODS,
  placeOrder,
  updateOrderStatus,
} from "../services/orders";

export const ordersRouter = Router();

const checkoutSchema = z.object({
  storeSlug: z.string().min(1).max(60),
  email: z.string().trim().email(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(100) }))
    .min(1)
    .max(50),
  shippingAddress: z.object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(7).max(20),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(80),
    district: z.string().trim().max(80).optional(),
    postalCode: z.string().trim().max(10).optional(),
  }),
  notes: z.string().max(1000).optional(),
});

// Public checkout. Limited per IP to blunt stock-hoarding bots.
ordersRouter.post(
  "/",
  rateLimit({ windowMs: 10 * 60_000, max: 30 }),
  asyncHandler(async (req, res) => {
    const { storeSlug, ...input } = parseBody(checkoutSchema, req.body);
    const order = await placeOrder(storeSlug, input);
    // The customer gets a receipt, not the platform's fee split.
    res.status(201).json({
      id: order.id,
      orderNumber: order.orderNumber,
      currency: order.currency,
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      shippingCents: order.shippingCents,
      totalCents: order.totalCents,
      paymentMethod: order.paymentMethod,
      items: order.items.map((i) => ({ productName: i.productName, quantity: i.quantity, unitPriceCents: i.unitPriceCents })),
    });
  }),
);

// ============ MERCHANT ============

ordersRouter.get(
  "/",
  ...merchant,
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { storeId: req.store!.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(orders);
  }),
);

ordersRouter.get(
  "/:id",
  ...merchant,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, storeId: req.store!.id }, include: orderInclude });
    if (!order) throw new HttpError(404, "Order not found");
    res.json(order);
  }),
);

ordersRouter.patch(
  "/:id/status",
  ...merchant,
  asyncHandler(async (req, res) => {
    const change = parseBody(
      z
        .object({
          status: z.enum(["confirmed", "completed", "cancelled"]).optional(),
          fulfillmentStatus: z.enum(FULFILLMENT_STATUSES).optional(),
        })
        .refine((c) => c.status || c.fulfillmentStatus, "Nothing to change"),
      req.body,
    );
    res.json(await updateOrderStatus(req.store!.id, req.params.id, change));
  }),
);

ordersRouter.post(
  "/:id/mark-paid",
  ...merchant,
  asyncHandler(async (req, res) => {
    res.json(await markCodOrderPaid(req.store!.id, req.params.id));
  }),
);
