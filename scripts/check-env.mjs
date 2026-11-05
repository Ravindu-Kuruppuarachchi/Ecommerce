/** Validate configuration without logging values or contacting external services. */
import { appEnv, readEnv } from './env-files.mjs';
const errors = [];
const api = await appEnv('apps/api');
const dashboard = await appEnv('apps/dashboard');
const storefront = await appEnv('apps/storefront');
const database = { ...await readEnv('packages/database/.env'), ...process.env };
const production = process.env.NODE_ENV === 'production';
function url(value, label, protocols = ['http:', 'https:'], requireHttps = production) {
  try { const parsed = new URL(value); if (!protocols.includes(parsed.protocol)) throw Error(); if (requireHttps && protocols.includes('https:') && parsed.protocol !== 'https:') throw Error(); return parsed; }
  catch { errors.push(`${label}: missing or invalid URL${production && protocols.includes('https:') ? ' (HTTPS required)' : ''}`); }
}
const apiDb = url(api.DATABASE_URL, 'API DATABASE_URL', ['postgres:', 'postgresql:']);
const schemaDb = url(database.DATABASE_URL, 'Database DATABASE_URL', ['postgres:', 'postgresql:']);
if (apiDb && schemaDb && ['hostname', 'port', 'pathname', 'username', 'password'].some(key => apiDb[key] !== schemaDb[key])) errors.push('API and Prisma database connections differ; migrations must target the API database');
if (!api.JWT_SECRET || api.JWT_SECRET.length < 32 || /change|your-secret|replace/i.test(api.JWT_SECRET)) errors.push('API JWT_SECRET: use at least 32 random characters');
for (const [label, value] of Object.entries({ 'API DASHBOARD_URL': api.DASHBOARD_URL, 'API STOREFRONT_URL': api.STOREFRONT_URL, 'API PUBLIC_API_URL': api.PUBLIC_API_URL, 'Dashboard NEXT_PUBLIC_API_URL': dashboard.NEXT_PUBLIC_API_URL, 'Dashboard NEXT_PUBLIC_STOREFRONT_URL': dashboard.NEXT_PUBLIC_STOREFRONT_URL, 'Storefront NEXT_PUBLIC_API_URL': storefront.NEXT_PUBLIC_API_URL })) url(value, label);
for (const value of (storefront.NEXT_PUBLIC_DASHBOARD_URL || '').split(',')) url(value.trim(), 'Storefront NEXT_PUBLIC_DASHBOARD_URL');
if (storefront.API_URL) url(storefront.API_URL, 'Storefront API_URL', ['http:', 'https:'], false);
if (!Number.isInteger(Number(api.PORT || 5000)) || Number(api.PORT || 5000) < 1 || Number(api.PORT || 5000) > 65535) errors.push('API PORT: use an integer from 1 to 65535');
if (!/^([0-9]|10)$/.test(api.TRUST_PROXY_HOPS || '0')) errors.push('API TRUST_PROXY_HOPS: use an integer from 0 to 10');
for (const [app, values] of [['dashboard', dashboard], ['storefront', storefront]]) {
  for (const key of Object.keys(values)) if (/^NEXT_PUBLIC_.*(SECRET|PASSWORD|PRIVATE_KEY|DATABASE_URL|JWT)/i.test(key)) errors.push(`${app}: ${key} would expose a secret to browsers`);
}
const google = [api.GOOGLE_CLIENT_ID, storefront.GOOGLE_CLIENT_ID, storefront.GOOGLE_CLIENT_SECRET];
if (google.some(Boolean)) {
  if (!google.every(Boolean)) errors.push('Google sign-in is partially configured; fill both client IDs and the server-only client secret');
  if (api.GOOGLE_CLIENT_ID !== storefront.GOOGLE_CLIENT_ID) errors.push('Google client IDs must match');
  const redirect = url(storefront.GOOGLE_REDIRECT_URI, 'Storefront GOOGLE_REDIRECT_URI');
  if (redirect && (redirect.pathname !== '/api/customer/google/callback' || redirect.search || redirect.hash)) errors.push('Google redirect must end in /api/customer/google/callback without query or fragment');
  if (redirect && api.STOREFRONT_URL) { try { if (redirect.origin !== new URL(api.STOREFRONT_URL).origin) errors.push('Google redirect origin must match STOREFRONT_URL'); } catch { /* Invalid origin reported above. */ } }
} else console.log('Google credentials are not configured; customer checkout remains unavailable.');
if (errors.length) { for (const error of errors) console.error(`- ${error}`); process.exitCode = 1; }
else console.log('Environment checks passed. No secret values were printed.');
