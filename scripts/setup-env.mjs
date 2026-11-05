/** Creates missing local configuration only. Never rotates existing credentials or resets data. */
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, readEnv, appEnv } from './env-files.mjs';
const api = await appEnv('apps/api');
const database = await readEnv('packages/database/.env');
const compose = await readEnv('.env');
const existingUrl = api.DATABASE_URL || database.DATABASE_URL;
const parsed = existingUrl ? new URL(existingUrl) : null;
const local = parsed && ['localhost', '127.0.0.1'].includes(parsed.hostname);
const user = compose.POSTGRES_USER || (local && decodeURIComponent(parsed.username)) || 'ecommerce';
const password = compose.POSTGRES_PASSWORD || (local && decodeURIComponent(parsed.password)) || randomBytes(24).toString('hex');
const db = compose.POSTGRES_DB || (local && parsed.pathname.slice(1)) || 'ecommerce';
const port = compose.POSTGRES_PORT || (local && parsed.port) || '5432';
const databaseUrl = existingUrl || `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:${port}/${db}?schema=public`;
const targets = [
  ['.env', { POSTGRES_USER: user, POSTGRES_PASSWORD: password, POSTGRES_DB: db, POSTGRES_PORT: port, PGADMIN_DEFAULT_PASSWORD: randomBytes(24).toString('hex') }],
  ['apps/api/.env.local', { DATABASE_URL: databaseUrl, JWT_SECRET: randomBytes(32).toString('hex') }],
  ['apps/dashboard/.env.local', {}],
  ['apps/storefront/.env.local', {}],
  ['packages/database/.env', { DATABASE_URL: databaseUrl }],
];
for (const [target, overrides] of targets) {
  const example = target === '.env' ? '.env.example' : path.join(path.dirname(target), '.env.example');
  let content = await readFile(path.join(root, example), 'utf8');
  for (const [key, value] of Object.entries(overrides)) content = content.replace(new RegExp(`^${key}=.*$`, 'm'), () => `${key}=${JSON.stringify(value)}`);
  try { await writeFile(path.join(root, target), content, { flag: 'wx', mode: 0o600 }); console.log(`Created ${target}`); }
  catch (error) { if (error.code === 'EEXIST') console.log(`Preserved ${target}`); else throw error; }
}
console.log('Run pnpm env:check next. Add Google OAuth credentials to enable purchasing.');
