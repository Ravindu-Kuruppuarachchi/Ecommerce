import { z } from "zod/v3";
import { toMinor } from "@repo/core";

/** Decimal input to bounded PostgreSQL integer minor units. */
export const moneyInput = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const cents = toMinor(value);
  if (cents === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter an amount from 0 to 21,474,836.47 with at most two decimal places" });
    return z.NEVER;
  }
  return cents;
});
