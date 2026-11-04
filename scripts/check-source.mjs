/** Fast repository integrity checks; no network calls and no secret values in output. */
import { readdir, readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { root } from './env-files.mjs';
const failures = [];
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.filter(e => !['node_modules', 'dist', '.git', '.turbo', 'uploads'].includes(e.name) && !e.name.startsWith('.next')).map(e => e.isDirectory() ? files(path.join(directory, e.name)) : [path.join(directory, e.name)]));
  return nested.flat();
}
const all = await files(root);
const source = all.filter(file => /\.(?:tsx?|js|mjs)$/.test(file) && !file.endsWith('.d.ts'));
let links = 0;
for (const file of all.filter(file => file.endsWith('.md'))) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!href || /^[a-z]+:|^\/\//i.test(href)) continue;
    const target = path.resolve(path.dirname(file), href);
    links++;
    try { await stat(target); } catch { failures.push(`${path.relative(root, file)}: missing documentation target ${href}`); }
  }
}
for (const app of ['dashboard', 'storefront']) {
  const dir = path.join(root, 'apps', app, 'src', 'app');
  const routes = all.filter(file => file.startsWith(dir + path.sep) && /\/page\.tsx$/.test(file)).map(file => {
    const route = path.relative(dir, path.dirname(file)).split(path.sep).filter(part => part && !/^\(.*\)$/.test(part)).join('/');
    return new RegExp('^/' + route.split('/').map(part => part.startsWith('[') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/') + '/?$');
  });
  for (const file of source.filter(file => file.startsWith(path.join(root, 'apps', app, 'src') + path.sep))) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(/href=["'](\/[^"']*)["']/g)) {
      const href = match[1].split(/[?#]/)[0];
      if (!routes.some(route => route.test(href))) failures.push(`${path.relative(root, file)}: missing static route ${href}`);
      links++;
    }
  }
}
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
for (const file of tracked) if (/(^|\/)\.env(?:\..*)?$/.test(file) && !file.endsWith('.example')) failures.push(`Private environment file tracked in Git: ${file}`);
for (const file of source.filter(file => /\/src\//.test(file))) {
  const text = await readFile(file, 'utf8');
  if (/NEXT_PUBLIC_\w*(?:SECRET|PASSWORD|PRIVATE_KEY|DATABASE_URL|JWT)/.test(text)) failures.push(`${path.relative(root, file)}: secret-like public environment variable`);
}
if (failures.length) { failures.forEach(message => console.error(message)); process.exitCode = 1; }
else console.log(`Source integrity passed: ${source.length} source files, ${links} static/documentation links, no tracked private environment files.`);
