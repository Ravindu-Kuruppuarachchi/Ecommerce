// Pricing rules shared by checkout (authoritative, in the API) and the
// storefront (estimates while the customer fills in the form).

export const SRI_LANKA_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota",
  "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale",
  "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura",
  "Trincomalee", "Vavuniya",
] as const;

export type District = (typeof SRI_LANKA_DISTRICTS)[number];

export function isDistrict(value: unknown): value is District {
  return typeof value === "string" && (SRI_LANKA_DISTRICTS as readonly string[]).includes(value);
}

// ---- Shipping ----

export interface ZoneLike {
  name: string;
  districts: string[];
  rateCents: number;
  freeOverCents: number | null;
  estimatedDays?: string | null;
}

export function zoneForDistrict<Z extends ZoneLike>(zones: Z[], district: string): Z | null {
  return zones.find((z) => z.districts.includes(district)) ?? null;
}

/** Delivery fee for a zone, given the subtotal after discounts. */
export function deliveryFee(zone: ZoneLike, discountedSubtotalCents: number): number {
  return zone.freeOverCents !== null && discountedSubtotalCents >= zone.freeOverCents ? 0 : zone.rateCents;
}

// ---- Discounts ----

export const DISCOUNT_TYPES = ["percent", "fixed", "free_shipping"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export interface DiscountLike {
  id: string;
  title: string;
  code: string | null;
  type: string;
  value: number;
  minSubtotalCents: number;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
}

/** Why a discount can't be used right now, or null if it can. */
export function discountProblem(d: DiscountLike, subtotalCents: number, now = new Date()): string | null {
  if (!d.active) return "This code isn't active";
  if (d.startsAt && new Date(d.startsAt) > now) return "This code isn't active yet";
  if (d.endsAt && new Date(d.endsAt) < now) return "This code has expired";
  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) return "This code has been fully used";
  if (subtotalCents < d.minSubtotalCents) return "Your order doesn't reach this code's minimum spend";
  return null;
}

/** Amount taken off the goods subtotal. Free-shipping discounts return 0 here; they zero the delivery fee instead. */
export function goodsDiscount(d: Pick<DiscountLike, "type" | "value">, subtotalCents: number): number {
  if (d.type === "percent") return Math.min(subtotalCents, Math.round((subtotalCents * d.value) / 10_000));
  if (d.type === "fixed") return Math.min(subtotalCents, d.value);
  return 0;
}

export function describeDiscount(d: Pick<DiscountLike, "type" | "value">, format: (cents: number) => string): string {
  if (d.type === "percent") return `${d.value / 100}% off`;
  if (d.type === "fixed") return `${format(d.value)} off`;
  return "Free delivery";
}

/**
 * Picks the discount that saves the customer the most. Only one discount
 * applies per order; codes and automatic discounts don't stack.
 */
export function bestDiscount<D extends DiscountLike>(candidates: D[], subtotalCents: number, shippingCents: number, now = new Date()): D | null {
  let best: D | null = null;
  let bestSaving = 0;
  for (const d of candidates) {
    if (discountProblem(d, subtotalCents, now)) continue;
    const saving = d.type === "free_shipping" ? shippingCents : goodsDiscount(d, subtotalCents);
    if (saving > bestSaving) {
      best = d;
      bestSaving = saving;
    }
  }
  return best;
}

// ---- Variants ----

export interface ProductOption {
  name: string;
  values: string[];
}

/** Every combination of option values, in option order. */
export function variantCombinations(options: ProductOption[]): Array<Record<string, string>> {
  return options.reduce<Array<Record<string, string>>>(
    (combos, option) => combos.flatMap((combo) => option.values.map((value) => ({ ...combo, [option.name]: value }))),
    [{}],
  );
}

export function variantTitle(options: ProductOption[], values: Record<string, string>): string {
  return options.map((o) => values[o.name]).filter(Boolean).join(" / ");
}

export const MAX_OPTIONS = 3;
export const MAX_VARIANTS = 100;
