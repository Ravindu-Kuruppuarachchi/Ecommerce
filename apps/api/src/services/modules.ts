import type { Prisma } from "@prisma/client";
import { effectiveModules, type ModuleKey } from "@repo/core";
import { prisma } from "../lib/prisma";

/** Core modules plus the optional ones this store has switched on. */
export async function activeModules(storeId: string, tx: Prisma.TransactionClient = prisma): Promise<Set<ModuleKey>> {
  const rows = await tx.storeModule.findMany({ where: { storeId, enabled: true }, select: { key: true } });
  return new Set(effectiveModules(rows.map((r) => r.key)));
}
