import type { Discount, Prisma, ShippingZone } from "@prisma/client";
import { bestDiscount, deliveryFee, discountProblem, goodsDiscount, zoneForDistrict } from "@repo/core";
import { HttpError } from "../lib/http";
import { activeModules } from "./modules";

export interface PriceQuote {
  zone: ShippingZone | null;
  /** Delivery fee before any free-delivery discount. */
  shippingBeforeDiscount: number;
  shipping: number;
  discount: Discount | null;
  discountCents: number;
}

/**
 * Works out delivery and the discount for a basket. Used by checkout (inside
 * its transaction) and by the storefront's live quote, so both agree.
 */
export async function quote(
  tx: Prisma.TransactionClient,
  storeId: string,
  input: { subtotalCents: number; district?: string; code?: string },
): Promise<PriceQuote> {
  const modules = await activeModules(storeId, tx);
  const now = new Date();

  // Discounts are evaluated against the goods subtotal; delivery depends on the discounted amount.
  let candidates: Discount[] = [];
  if (modules.has("discounts")) {
    candidates = await tx.discount.findMany({ where: { storeId, active: true, code: null } });
    if (input.code) {
      const code = input.code.trim().toUpperCase();
      const coded = await tx.discount.findUnique({ where: { storeId_code: { storeId, code } } });
      if (!coded) throw new HttpError(404, "That discount code doesn't exist");
      const problem = discountProblem(coded, input.subtotalCents, now);
      if (problem) throw new HttpError(409, problem);
      candidates.push(coded);
    }
  } else if (input.code) {
    throw new HttpError(404, "That discount code doesn't exist");
  }

  let zone: ShippingZone | null = null;
  const zoneFee = (discounted: number) => (zone ? deliveryFee(zone, discounted) : 0);
  if (modules.has("shipping")) {
    if (!input.district) throw new HttpError(400, "Choose your district for delivery");
    const zones = await tx.shippingZone.findMany({ where: { storeId }, orderBy: { position: "asc" } });
    zone = zoneForDistrict(zones, input.district);
    if (!zone) throw new HttpError(409, `Sorry, this store doesn't deliver to ${input.district} yet`);
  }

  // The fee a free-delivery code would waive is judged before other discounts apply.
  const discount = bestDiscount(candidates, input.subtotalCents, zoneFee(input.subtotalCents), now);
  const discountCents = discount ? goodsDiscount(discount, input.subtotalCents) : 0;
  const shippingBeforeDiscount = zoneFee(input.subtotalCents - discountCents);
  const shipping = discount?.type === "free_shipping" ? 0 : shippingBeforeDiscount;
  return { zone, shippingBeforeDiscount, shipping, discount, discountCents };
}
