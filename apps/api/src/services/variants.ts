import type { Prisma } from "@prisma/client";
import { MAX_OPTIONS, MAX_VARIANTS, variantTitle, type ProductOption } from "@repo/core";
import { HttpError } from "../lib/http";
import { changeStock } from "./inventory";

export interface VariantInput {
  id?: string;
  optionValues: Record<string, string>;
  sku?: string | null;
  priceCents?: number | null;
  quantity: number;
}

/** Checks that every variant uses exactly the product's options, once per combination. */
export function validateVariants(options: ProductOption[], variants: VariantInput[]): void {
  if (options.length > MAX_OPTIONS) throw new HttpError(400, `A product can have at most ${MAX_OPTIONS} options`);
  const names = options.map((o) => o.name.toLowerCase());
  if (new Set(names).size !== names.length) throw new HttpError(400, "Option names must be different");
  for (const o of options) {
    if (new Set(o.values.map((v) => v.toLowerCase())).size !== o.values.length) throw new HttpError(400, `"${o.name}" has the same value twice`);
  }
  if (!options.length) {
    if (variants.length) throw new HttpError(400, "Add options before adding variants");
    return;
  }
  if (!variants.length) throw new HttpError(400, "A product with options needs at least one variant");
  if (variants.length > MAX_VARIANTS) throw new HttpError(400, `A product can have at most ${MAX_VARIANTS} variants`);
  const seen = new Set<string>();
  for (const v of variants) {
    const keys = Object.keys(v.optionValues);
    if (keys.length !== options.length || options.some((o) => !o.values.includes(v.optionValues[o.name]))) {
      throw new HttpError(400, "Each variant needs one value for every option");
    }
    const title = variantTitle(options, v.optionValues);
    if (seen.has(title)) throw new HttpError(400, `"${title}" is listed twice`);
    seen.add(title);
  }
}

/**
 * Replaces a product's variants with the given list: matching ids are updated,
 * new ones created, missing ones deleted. Stock changes are logged as corrections.
 */
export async function syncVariants(
  tx: Prisma.TransactionClient,
  storeId: string,
  productId: string,
  options: ProductOption[],
  variants: VariantInput[],
): Promise<void> {
  const existing = await tx.productVariant.findMany({ where: { productId } });
  const keep = new Set(variants.map((v) => v.id).filter(Boolean));
  await tx.productVariant.deleteMany({ where: { productId, id: { notIn: [...keep] as string[] } } });

  for (const [position, v] of variants.entries()) {
    const fields = {
      title: variantTitle(options, v.optionValues),
      optionValues: v.optionValues,
      sku: v.sku || null,
      priceCents: v.priceCents ?? null,
      position,
    };
    const current = v.id ? existing.find((e) => e.id === v.id) : undefined;
    if (current) {
      await tx.productVariant.update({ where: { id: current.id }, data: fields });
      if (v.quantity !== current.quantity) {
        await changeStock(tx, { storeId, productId, variantId: current.id, change: v.quantity - current.quantity, reason: "correction", note: "Edited on the product page" });
      }
    } else {
      const created = await tx.productVariant.create({ data: { ...fields, productId, quantity: 0 } });
      if (v.quantity > 0) await changeStock(tx, { storeId, productId, variantId: created.id, change: v.quantity, reason: "restock", note: "Initial stock" });
    }
  }
}
