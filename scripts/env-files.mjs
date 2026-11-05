import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const dotenv = createRequire(path.join(root, 'apps/api/package.json'))('dotenv');
export async function readEnv(relative) {
  try { return dotenv.parse(await readFile(path.join(root, relative))); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
}
export async function appEnv(app) {
  return { ...await readEnv(`${app}/.env`), ...await readEnv(`${app}/.env.local`), ...process.env };
}
