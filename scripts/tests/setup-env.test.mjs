import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, symlink, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { root, dotenv } from '../env-files.mjs';
const exec = promisify(execFile);

test('fresh setup generates matching private credentials, preserves files, and checks errors without leaking values', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'ecommerce-env-test-'));
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^(DATABASE_URL|JWT_SECRET|NODE_ENV|PORT|TRUST_PROXY_HOPS|GOOGLE_|NEXT_PUBLIC_|API_URL|DASHBOARD_URL|STOREFRONT_URL|PUBLIC_API_URL)/.test(key)) delete env[key];
  try {
    for (const dir of ['scripts', 'apps/api', 'apps/dashboard', 'apps/storefront', 'packages/database']) await mkdir(path.join(fixture, dir), { recursive: true });
    for (const file of ['scripts/setup-env.mjs', 'scripts/check-env.mjs', 'scripts/env-files.mjs', '.env.example', 'apps/api/package.json', 'apps/api/.env.example', 'apps/dashboard/.env.example', 'apps/storefront/.env.example', 'packages/database/.env.example']) await cp(path.join(root, file), path.join(fixture, file));
    await symlink(path.join(root, 'apps/api/node_modules'), path.join(fixture, 'apps/api/node_modules'), 'dir');
    const setup = () => exec(process.execPath, ['scripts/setup-env.mjs'], { cwd: fixture, env });
    const first = await setup();
    const files = ['.env', 'apps/api/.env.local', 'apps/dashboard/.env.local', 'apps/storefront/.env.local', 'packages/database/.env'];
    const before = await Promise.all(files.map(file => readFile(path.join(fixture, file), 'utf8')));
    const compose = dotenv.parse(before[0]); const api = dotenv.parse(before[1]); const db = dotenv.parse(before[4]);
    assert.equal(api.JWT_SECRET.length, 64);
    assert(compose.POSTGRES_PASSWORD.length >= 32);
    assert.equal(api.DATABASE_URL, db.DATABASE_URL);
    assert.equal(decodeURIComponent(new URL(api.DATABASE_URL).password), compose.POSTGRES_PASSWORD);
    assert(!first.stdout.includes(api.JWT_SECRET)); assert(!first.stdout.includes(compose.POSTGRES_PASSWORD));
    for (const file of files) assert.equal((await stat(path.join(fixture, file))).mode & 0o777, 0o600);
    await setup();
    assert.deepEqual(await Promise.all(files.map(file => readFile(path.join(fixture, file), 'utf8'))), before);
    const checked = await exec(process.execPath, ['scripts/check-env.mjs'], { cwd: fixture, env });
    assert(checked.stdout.includes('Environment checks passed'));
    await writeFile(path.join(fixture, 'apps/storefront/.env.local'), before[3] + '\nNEXT_PUBLIC_PRIVATE_KEY=fixture-secret-never-print\n');
    await assert.rejects(exec(process.execPath, ['scripts/check-env.mjs'], { cwd: fixture, env }), error => {
      assert(error.stderr.includes('would expose a secret'));
      assert(!error.stderr.includes('fixture-secret-never-print')); return true;
    });
  } finally { await rm(fixture, { recursive: true, force: true }); }
});
