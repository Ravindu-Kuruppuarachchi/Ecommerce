// All money is stored and computed as integers in the currency's minor unit
// (cents for LKR/USD). Floats only appear at the UI edge, when formatting or
// parsing what a person typed.

export type CurrencyCode = "LKR" | "USD";

export const DEFAULT_CURRENCY: CurrencyCode = "LKR";

/** Platform commission in basis points (1000 = 10%). Stores can be given a different rate. */
export const DEFAULT_PLATFORM_FEE_BPS = 1000;

/** Apply a basis-point rate to an amount, rounding half up to the nearest minor unit. */
export function applyBps(amountMinor: number, bps: number): number {
  return Math.round((amountMinor * bps) / 10_000);
}

/** Parse user input like "1,250.50" into minor units. Returns null for anything that isn't a non-negative amount. */
export function toMinor(input: string | number): number | null {
  const text = String(input).replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= 2_147_483_647 ? cents : null;
}

/** Minor units to a plain decimal string for form inputs, e.g. 125050 -> "1250.50". */
export function toMajorString(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

export function formatMoney(amountMinor: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export interface OrderTotals {
  subtotal: number;
  /** Taken off the goods subtotal. Free-delivery discounts show up as shipping = 0 instead. */
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  /** The platform's cut: charged on goods after discounts. Tax and delivery are pass-through. */
  platformFee: number;
  /** What the merchant is owed for this order before any refunds. */
  merchantNet: number;
}

export function computeOrderTotals(params: {
  lines: Array<{ unitPrice: number; quantity: number }>;
  taxBps: number;
  shipping: number;
  platformFeeBps: number;
  discount?: number;
}): OrderTotals {
  const subtotal = params.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = Math.min(params.discount ?? 0, subtotal);
  const goods = subtotal - discount;
  const tax = applyBps(goods, params.taxBps);
  const total = goods + tax + params.shipping;
  const platformFee = applyBps(goods, params.platformFeeBps);
  return {
    subtotal,
    discount,
    tax,
    shipping: params.shipping,
    total,
    platformFee,
    merchantNet: total - platformFee,
  };
}
