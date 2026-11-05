/** Add missing template department pages once, preserving existing merchant content. */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiRequire = createRequire(path.join(root, 'apps/api/package.json'));
apiRequire('dotenv').config({ path: path.join(root, 'apps/api/.env.local') });
apiRequire('dotenv').config({ path: path.join(root, 'apps/api/.env') });
const { PrismaClient } = apiRequire('@prisma/client');
const { prepareStorePages } = await import('../apps/api/src/services/stores.ts');
const db = new PrismaClient();
try {
  const stores = await db.store.findMany({ where: { pageSetupVersion: { lt: 1 } }, select: { id: true } });
  for (const store of stores) await db.$transaction(tx => prepareStorePages(tx, store.id));
  console.log(`Prepared navigation pages for ${stores.length} stores. Existing page content preserved.`);
} finally { await db.$disconnect(); }
