import type { Prisma } from "@prisma/client";
import { HttpError } from "../lib/http";

export const ADJUSTMENT_REASONS = ["restock", "correction", "damaged", "order", "cancellation"] as const;
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

interface StockChange {
  storeId: string;
  productId: string;
  variantId?: string | null;
  change: number;
  reason: AdjustmentReason;
  note?: string;
}

/**
 * Moves stock for a product or one of its variants and records why.
 * Decreases fail instead of going below zero, which is what stops two
 * checkouts selling the same last unit.
 */
export async function changeStock(tx: Prisma.TransactionClient, c: StockChange): Promise<number> {
  const guard = c.change < 0 ? { quantity: { gte: -c.change } } : {};
  let quantityAfter: number;
  if (c.variantId) {
    const res = await tx.productVariant.updateMany({
      where: { id: c.variantId, productId: c.productId, ...guard },
      data: { quantity: { increment: c.change } },
    });
    if (res.count === 0) throw new HttpError(409, "Not enough stock");
    quantityAfter = (await tx.productVariant.findUniqueOrThrow({ where: { id: c.variantId }, select: { quantity: true } })).quantity;
  } else {
    const res = await tx.product.updateMany({
      where: { id: c.productId, storeId: c.storeId, ...guard },
      data: { quantity: { increment: c.change } },
    });
    if (res.count === 0) throw new HttpError(409, "Not enough stock");
    quantityAfter = (await tx.product.findUniqueOrThrow({ where: { id: c.productId }, select: { quantity: true } })).quantity;
  }
  await tx.inventoryAdjustment.create({
    data: {
      storeId: c.storeId,
      productId: c.productId,
      variantId: c.variantId ?? null,
      change: c.change,
      quantityAfter,
      reason: c.reason,
      note: c.note,
    },
  });
  return quantityAfter;
}
