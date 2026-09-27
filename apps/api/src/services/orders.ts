import { Prisma, type Order } from "@prisma/client";
import { computeOrderTotals } from "@repo/core";
import { HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";

export const PAYMENT_METHODS = ["cod"] as const; // "card" arrives with the PayHere integration
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface CheckoutInput {
  email: string;
  paymentMethod: PaymentMethod;
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    district?: string;
    postalCode?: string;
  };
  notes?: string;
}

export const orderInclude = {
  items: true,
  customer: true,
  shippingAddress: true,
  payments: true,
} satisfies Prisma.OrderInclude;

/**
 * Places an order from the storefront. Prices always come from the database,
 * never from the client, and stock is reserved in the same transaction so two
 * customers can't buy the last unit.
 */
export async function placeOrder(storeSlug: string, input: CheckoutInput) {
  // Merge repeated lines for the same product.
  const quantities = new Map<string, number>();
  for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { slug: storeSlug } });
    if (!store || store.status === "suspended") throw new HttpError(404, "Store not found");
    if (store.status !== "live") throw new HttpError(409, "This store isn't taking orders yet");

    const products = await tx.product.findMany({
      where: { id: { in: [...quantities.keys()] }, storeId: store.id, status: "active" },
    });
    if (products.length !== quantities.size) throw new HttpError(400, "Some items are no longer available");

    for (const product of products) {
      const quantity = quantities.get(product.id)!;
      const reserved = await tx.product.updateMany({
        where: { id: product.id, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });
      if (reserved.count === 0) throw new HttpError(409, `Only ${product.quantity} of "${product.name}" left in stock`);
    }

    const totals = computeOrderTotals({
      lines: products.map((p) => ({ unitPrice: p.priceCents, quantity: quantities.get(p.id)! })),
      taxBps: store.taxBps,
      shipping: 0, // set by the shipping module once delivery zones exist
      platformFeeBps: store.platformFeeBps,
    });

    const email = input.email.toLowerCase();
    const customer = await tx.customer.upsert({
      where: { storeId_email: { storeId: store.id, email } },
      create: { storeId: store.id, email, phone: input.shippingAddress.phone },
      update: { phone: input.shippingAddress.phone },
    });

    const { orderCounter } = await tx.store.update({
      where: { id: store.id },
      data: { orderCounter: { increment: 1 } },
      select: { orderCounter: true },
    });

    return tx.order.create({
      data: {
        storeId: store.id,
        orderNumber: orderCounter,
        customerId: customer.id,
        paymentMethod: input.paymentMethod,
        currency: store.currency,
        subtotalCents: totals.subtotal,
        taxCents: totals.tax,
        shippingCents: totals.shipping,
        totalCents: totals.total,
        platformFeeBps: store.platformFeeBps,
        platformFeeCents: totals.platformFee,
        merchantNetCents: totals.merchantNet,
        notes: input.notes,
        items: {
          create: products.map((p) => ({
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            unitPriceCents: p.priceCents,
            quantity: quantities.get(p.id)!,
          })),
        },
        shippingAddress: { create: { ...input.shippingAddress, email } },
        payments: {
          create: { storeId: store.id, provider: input.paymentMethod, amountCents: totals.total, currency: store.currency },
        },
      },
      include: orderInclude,
    });
  });
}

/**
 * Records that an order's money has been collected and posts the matching
 * ledger entries. For cash on delivery the merchant already holds the cash, so
 * only the platform fee is posted (it's deducted from their next payout).
 * Ledger keys make this safe to call twice.
 */
export async function recordOrderPaid(tx: Prisma.TransactionClient, order: Order): Promise<void> {
  const base = { storeId: order.storeId, orderId: order.id, currency: order.currency };
  const entries: Prisma.LedgerEntryCreateManyInput[] = [];
  if (order.paymentMethod !== "cod") {
    entries.push({ ...base, type: "sale", amountCents: order.totalCents, key: `order:${order.id}:sale` });
  }
  entries.push({
    ...base,
    type: "platform_fee",
    amountCents: -order.platformFeeCents,
    key: `order:${order.id}:platform_fee`,
    memo: `${order.platformFeeBps / 100}% commission on order #${order.orderNumber}`,
  });
  await tx.ledgerEntry.createMany({ data: entries, skipDuplicates: true });

  await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "paid" } });
  await tx.payment.updateMany({ where: { orderId: order.id, status: "pending" }, data: { status: "succeeded" } });
}

/** Merchant confirms cash was collected for a COD order. */
export async function markCodOrderPaid(storeId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, storeId } });
    if (!order) throw new HttpError(404, "Order not found");
    if (order.paymentMethod !== "cod") throw new HttpError(400, "Only cash-on-delivery orders can be marked paid by hand");
    if (order.status === "cancelled") throw new HttpError(409, "This order was cancelled");
    if (order.paymentStatus !== "unpaid") throw new HttpError(409, "This order is already paid");
    await recordOrderPaid(tx, order);
    return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
  });
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const FULFILLMENT_STATUSES = ["unfulfilled", "packed", "shipped", "delivered", "returned"] as const;

export async function updateOrderStatus(
  storeId: string,
  orderId: string,
  change: { status?: string; fulfillmentStatus?: (typeof FULFILLMENT_STATUSES)[number] },
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, storeId }, include: { items: true } });
    if (!order) throw new HttpError(404, "Order not found");

    if (change.status && change.status !== order.status) {
      if (!STATUS_TRANSITIONS[order.status]?.includes(change.status)) {
        throw new HttpError(409, `Can't move an order from ${order.status} to ${change.status}`);
      }
      if (change.status === "cancelled") {
        if (order.paymentStatus === "paid") throw new HttpError(409, "Paid orders need a refund, which isn't supported yet");
        // Put reserved stock back; skip lines whose product has since been deleted.
        for (const item of order.items) {
          if (item.productId) {
            await tx.product.updateMany({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });
          }
        }
        await tx.payment.updateMany({ where: { orderId: order.id, status: "pending" }, data: { status: "failed" } });
      }
    }
    if (change.fulfillmentStatus && order.status === "cancelled") throw new HttpError(409, "This order was cancelled");

    return tx.order.update({
      where: { id: order.id },
      data: { status: change.status, fulfillmentStatus: change.fulfillmentStatus },
      include: orderInclude,
    });
  });
}
