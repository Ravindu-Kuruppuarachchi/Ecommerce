import { Prisma, type Order, type Customer } from "@prisma/client";
import { computeOrderTotals } from "@repo/core";
import { HttpError } from "../lib/http";
import { changeStock } from "./inventory";
import { quote } from "./pricing";
import { prisma } from "../lib/prisma";

export const PAYMENT_METHODS = ["cod"] as const; // "card" arrives with the PayHere integration
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface CheckoutInput {
  paymentMethod: PaymentMethod;
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  discountCode?: string;
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

const lineKey = (productId: string, variantId?: string | null) => `${productId}:${variantId ?? ""}`;

/**
 * Places an order from the storefront. Prices, delivery and discounts are
 * always worked out here from the database, never taken from the client, and
 * stock is reserved in the same transaction so two customers can't buy the
 * last unit.
 */
export async function placeOrder(storeSlug: string, input: CheckoutInput, identity: Pick<Customer, "id" | "storeId" | "email">) {
  // Merge repeated lines for the same product and variant.
  const quantities = new Map<string, { productId: string; variantId?: string; quantity: number }>();
  for (const item of input.items) {
    const key = lineKey(item.productId, item.variantId);
    const existing = quantities.get(key);
    quantities.set(key, { ...item, quantity: (existing?.quantity ?? 0) + item.quantity });
  }
  const lines = [...quantities.values()];

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { slug: storeSlug } });
    if (!store || store.status === "suspended") throw new HttpError(404, "Store not found");
    if (identity.storeId !== store.id) throw new HttpError(403, "Sign in to this store before making a purchase");
    if (store.status !== "live") throw new HttpError(409, "This store isn't taking orders yet");

    const products = await tx.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) }, storeId: store.id, status: "active" },
      include: { variants: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const priced = lines.map((line) => {
      const product = byId.get(line.productId);
      if (!product) throw new HttpError(400, "Some items are no longer available");
      if (product.variants.length > 0) {
        // Products with variants must be bought as a specific variant.
        const variant = product.variants.find((v) => v.id === line.variantId);
        if (!variant) throw new HttpError(400, `Choose an option for "${product.name}"`);
        return { ...line, product, variant, unitPrice: variant.priceCents ?? product.priceCents, name: product.name, sku: variant.sku ?? product.sku };
      }
      if (line.variantId) throw new HttpError(400, "Some items are no longer available");
      return { ...line, product, variant: null, unitPrice: product.priceCents, name: product.name, sku: product.sku };
    });

    for (const line of priced) {
      const label = line.variant ? `${line.name} (${line.variant.title})` : line.name;
      const available = line.variant?.quantity ?? line.product.quantity;
      try {
        await changeStock(tx, { storeId: store.id, productId: line.productId, variantId: line.variant?.id, change: -line.quantity, reason: "order" });
      } catch {
        throw new HttpError(409, available > 0 ? `Only ${available} of "${label}" left in stock` : `"${label}" is sold out`);
      }
    }

    const subtotalCents = priced.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const pricing = await quote(tx, store.id, {
      subtotalCents,
      district: input.shippingAddress.district,
      code: input.discountCode,
    });

    if (pricing.discount) {
      // Conditional increment: if another checkout used the last redemption first, this matches nothing.
      const claimed = await tx.discount.updateMany({
        where: {
          id: pricing.discount.id,
          ...(pricing.discount.usageLimit !== null && { usedCount: { lt: pricing.discount.usageLimit } }),
        },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count === 0) throw new HttpError(409, "This code has been fully used");
    }

    const totals = computeOrderTotals({
      lines: priced.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })),
      taxBps: store.taxBps,
      shipping: pricing.shipping,
      discount: pricing.discountCents,
      platformFeeBps: store.platformFeeBps,
    });

    if (Object.values(totals).some(value => !Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647)) {
      throw new HttpError(400, "This order exceeds the supported amount. Please reduce the quantity.");
    }
    const email = identity.email;
    const customer = await tx.customer.update({
      where: { id: identity.id, storeId: store.id },
      data: { phone: input.shippingAddress.phone, savedAddress: input.shippingAddress },
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
        discountCents: totals.discount,
        taxCents: totals.tax,
        shippingCents: totals.shipping,
        totalCents: totals.total,
        platformFeeBps: store.platformFeeBps,
        platformFeeCents: totals.platformFee,
        merchantNetCents: totals.merchantNet,
        discountId: pricing.discount?.id,
        discountCode: pricing.discount?.code,
        discountTitle: pricing.discount?.title,
        shippingZoneName: pricing.zone?.name,
        notes: input.notes,
        items: {
          create: priced.map((l) => ({
            productId: l.productId,
            productName: l.name,
            variantId: l.variant?.id,
            variantTitle: l.variant?.title,
            sku: l.sku,
            unitPriceCents: l.unitPrice,
            quantity: l.quantity,
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
  await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${order.storeId} FOR UPDATE`;
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
    // Serialize payment and status changes on this order before reading its state.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} AND "storeId" = ${storeId} FOR UPDATE`;
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
  change: { status?: string; fulfillmentStatus?: (typeof FULFILLMENT_STATUSES)[number]; courier?: string | null; trackingNumber?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    // Serialize payment and status changes on this order before reading its state.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} AND "storeId" = ${storeId} FOR UPDATE`;
    const order = await tx.order.findFirst({ where: { id: orderId, storeId }, include: { items: true } });
    if (!order) throw new HttpError(404, "Order not found");

    if (change.status && change.status !== order.status) {
      if (!STATUS_TRANSITIONS[order.status]?.includes(change.status)) {
        throw new HttpError(409, `Can't move an order from ${order.status} to ${change.status}`);
      }
      if (change.status === "cancelled") {
        if (order.paymentStatus === "paid") throw new HttpError(409, "Paid orders need a refund, which isn't supported yet");
        // Put reserved stock back; skip lines whose product or variant has since been deleted.
        for (const item of order.items) {
          if (!item.productId) continue;
          const variantGone = item.variantTitle !== null && item.variantId === null;
          if (variantGone) continue;
          await changeStock(tx, { storeId, productId: item.productId, variantId: item.variantId, change: item.quantity, reason: "cancellation", note: `Order #${order.orderNumber}` });
        }
        if (order.discountId) {
          await tx.discount.updateMany({ where: { id: order.discountId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
        }
        await tx.payment.updateMany({ where: { orderId: order.id, status: "pending" }, data: { status: "failed" } });
      }
    }
    if (change.fulfillmentStatus && order.status === "cancelled") throw new HttpError(409, "This order was cancelled");

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: change.status,
        fulfillmentStatus: change.fulfillmentStatus,
        courier: change.courier,
        trackingNumber: change.trackingNumber,
      },
      include: orderInclude,
    });
  });
}
