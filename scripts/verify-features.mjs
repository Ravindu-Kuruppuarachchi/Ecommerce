/** Integration audit against a disposable database; never writes to the configured store database. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes, generateKeyPairSync, createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const apiRequire = createRequire(path.join(root, 'apps/api/package.json'));
const { PrismaClient } = require('@prisma/client');
const { TEMPLATES, TEMPLATE_KEYS, SHOP_TYPES, createSection, defaultCatalogSections, PRODUCTS_PAGE_SLUG, variantCombinations, pageNavigation, pagePath, productQueries } = require('./packages/core/src');
const dotenv = apiRequire('dotenv');
dotenv.config({ path: path.join(root, 'apps/api/.env.local') });
dotenv.config({ path: path.join(root, 'apps/api/.env') });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = { startedAt: new Date().toISOString(), isolation: 'Disposable PostgreSQL database and API process', checks: [], templates: [], limitations: ['Card payments / PayHere', 'Refunds', 'Courier booking and tracking integrations', 'Custom-domain DNS/TLS provisioning', 'Reviews and blog modules', 'Order email/SMS notifications'] };
let admin, db, server, dbName, workspace;
let databaseCreated = false;
let apiLog = '';
let base, token, store, product, variant, zone;
let adminToken;
let customerToken, customerId;
const googleClientId = 'isolated-google-client.apps.googleusercontent.com';
const googleNonce = randomBytes(32).toString('hex');
const { privateKey: googlePrivateKey, publicKey: googlePublicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const googleJwk = { ...googlePublicKey.export({ format: 'jwk' }), kid: 'isolated-google-qa', alg: 'RS256', use: 'sig' };
function googleToken(overrides = {}) {
    return apiRequire('jsonwebtoken').sign({ sub: 'google-qa-customer', email: 'customer@example.test', email_verified: true, nonce: googleNonce,
        given_name: 'QA', family_name: 'Customer', iss: 'https://accounts.google.com', aud: googleClientId,
        iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, ...overrides }, googlePrivateKey, { algorithm: 'RS256', keyid: googleJwk.kid });
}
let checkoutRequests = 0;
async function run(command, args, env) { const child = spawn(command, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] }); let log = ''; child.stdout.on('data', d => log += d); child.stderr.on('data', d => log += d); const [code] = await once(child, 'exit'); if (code !== 0)
    throw Error(`Command failed (${code}): ${log}`); }
async function request(route, { method = 'GET', data, auth = token, status = 200, raw, headers = {} } = {}) {
    if (route === '/orders' && method === 'POST')
        checkoutRequests++;
    const response = await fetch(`${base}/api${route}`, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: data !== undefined ? JSON.stringify(data) : raw, signal: AbortSignal.timeout(20000) });
    const content = await response.text();
    let body;
    try {
        body = JSON.parse(content);
    }
    catch {
        body = content;
    }
    assert.equal(response.status, status, `${method} ${route}: expected ${status}, received ${response.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    return body;
}
async function check(name, fn) { try {
    await fn();
    results.checks.push({ name, status: 'passed' });
    console.log(`PASS ${name}`);
}
catch (error) {
    results.checks.push({ name, status: 'failed', error: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
} }
const shippingAddress = { name: 'QA Customer', phone: '0770000000', line1: '1 Test Road', city: 'Colombo', district: 'Colombo' };
const checkout = (items = [{ productId: product.id, quantity: 1 }], extra = {}) => ({ storeSlug: store.slug, email: 'customer@example.test', paymentMethod: 'cod', items, shippingAddress, ...extra });
async function main() {
    try {
        assert(process.env.DATABASE_URL, 'Configure apps/api/.env.local before running integration checks');
        const configuredUrl = new URL(process.env.DATABASE_URL);
        dbName = `ecommerce_feature_qa_${Date.now()}_${randomBytes(3).toString('hex')}`;
        assert(/^ecommerce_feature_qa_[a-z0-9_]+$/.test(dbName));
        admin = new PrismaClient({ datasources: { db: { url: configuredUrl.toString() } } });
        await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
        databaseCreated = true;
        const qaUrl = new URL(configuredUrl);
        qaUrl.pathname = `/${dbName}`;
        const listener = net.createServer();
        listener.listen(0, '127.0.0.1');
        await once(listener, 'listening');
        const port = listener.address().port;
        await new Promise(resolve => listener.close(resolve));
        workspace = await mkdtemp(path.join(tmpdir(), 'ecommerce-feature-qa-'));
        const env = { ...process.env, DATABASE_URL: qaUrl.toString(), PORT: String(port), JWT_SECRET: randomBytes(40).toString('hex'), UPLOAD_DIR: path.join(workspace, 'uploads'), PUBLIC_API_URL: `http://localhost:${port}`, NODE_ENV: 'development', GOOGLE_CLIENT_ID: googleClientId };
        await run(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--schema=packages/database/schema.prisma', '--skip-generate'], env);
        db = new PrismaClient({ datasources: { db: { url: qaUrl.toString() } } });
        // Only the disposable API imports this network fixture. Production verification has no bypass.
        const googleFixture = path.join(workspace, 'google-jwks-fixture.mjs');
        await writeFile(googleFixture, `const originalFetch = globalThis.fetch; globalThis.fetch = (url, options) => String(url) === 'https://www.googleapis.com/oauth2/v3/certs' ? Promise.resolve(new Response(JSON.stringify(${JSON.stringify({ keys: [googleJwk] })}), {headers:{'Content-Type':'application/json'}})) : originalFetch(url, options);`);
        server = spawn(process.execPath, ['--import', googleFixture, '--import', require.resolve('tsx'), 'src/index.ts'], { cwd: path.join(root, 'apps/api'), env, stdio: ['ignore', 'pipe', 'pipe'] });
        server.stdout.on('data', d => apiLog += d);
        server.stderr.on('data', d => apiLog += d);
        base = `http://localhost:${port}`;
        for (let n = 0; n < 80; n++) {
            try {
                if ((await fetch(`${base}/health`)).ok)
                    break;
            }
            catch { }
            if (server.exitCode !== null)
                throw Error(`QA API exited: ${apiLog}`);
            await delay(250);
            if (n === 79)
                throw Error('QA API did not start');
        }
        const account = await request('/auth/register', { method: 'POST', auth: null, status: 201, data: { email: 'merchant@example.test', password: 'FeatureQApassword123', storeName: 'Isolated Feature QA', storeSlug: 'feature-qa', templateKey: 'classic' } });
        token = account.token;
        store = account.store;
        await check('Google customer sign-in verifies signature, audience, issuer, nonce, expiry and verified email', async () => {
            const data = { storeSlug: store.slug, idToken: googleToken(), nonce: googleNonce };
            for (const overrides of [{ email_verified: false }, { aud: 'another-client' }, { iss: 'https://attacker.example' }, { nonce: 'wrong-nonce' }, { exp: 1 }]) {
                await request('/customer-auth/google', { method: 'POST', auth: null, status: 401, data: { ...data, idToken: googleToken(overrides) } });
            }
            const forgedKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
            const forged = apiRequire('jsonwebtoken').sign({ sub: 'forged' }, forgedKey, { algorithm: 'RS256', keyid: googleJwk.kid });
            await request('/customer-auth/google', { method: 'POST', auth: null, status: 401, data: { ...data, idToken: forged } });
            const legacy = await db.customer.create({ data: { storeId: store.id, email: 'customer@example.test', firstName: 'Existing', phone: '0770000000' } });
            const login = await request('/customer-auth/google', { method: 'POST', auth: null, data });
            customerToken = login.token;
            customerId = login.customer.id;
            assert.equal(customerId, legacy.id, 'Verified Google login preserves the existing customer profile');
            assert.equal(login.customer.firstName, 'Existing');
            assert.equal(login.customer.googleSubject, undefined);
            const session = await db.customerSession.findFirstOrThrow({ where: { customerId } });
            assert.equal(session.tokenHash, createHash('sha256').update(customerToken).digest('hex'));
            assert.notEqual(session.tokenHash, customerToken);
        });
        assert(customerToken, 'Customer login must succeed before checkout checks');
        await check('Checkout rejects guests and merchant tokens; customer sessions cannot access merchant routes', async () => {
            await request('/orders', { method: 'POST', auth: null, data: {}, status: 401 });
            await request('/orders', { method: 'POST', auth: token, data: {}, status: 401 });
            await request('/stores/me', { auth: customerToken, status: 401 });
            await request('/platform/overview', { auth: customerToken, status: 401 });
            await request('/customer-auth/session', { auth: token, status: 401 });
            await request('/customer-auth/session', { auth: customerToken, headers: { 'X-Store-Slug': 'another-store' }, status: 403 });
            assert.equal(await db.order.count(), 0);
        });
        await check('Customer profiles preserve verified email and isolate saved delivery information', async () => {
            const savedAddress = { ...shippingAddress, name: 'QA Customer' };
            const updated = await request('/customer-auth/profile', { method: 'PATCH', auth: customerToken, data: { firstName: 'QA', lastName: 'Customer', phone: '0770000000', savedAddress, email: 'spoofed@example.test', storeId: 'another-store' } });
            assert.equal(updated.customer.email, 'customer@example.test');
            assert.deepEqual(updated.customer.savedAddress, savedAddress);
            await request('/customer-auth/profile', { method: 'PATCH', auth: customerToken, data: { firstName: 'QA', lastName: 'Customer', phone: '', savedAddress: { name: 'Invalid' } }, status: 400 });
            const secondLogin = await request('/customer-auth/google', { method: 'POST', auth: null, data: { storeSlug: store.slug, idToken: googleToken(), nonce: googleNonce } });
            assert.equal(secondLogin.customer.id, customerId);
            assert.deepEqual(secondLogin.customer.savedAddress, savedAddress);
            await request('/customer-auth/session', { method: 'DELETE', auth: secondLogin.token });
            await request('/customer-auth/session', { auth: secondLogin.token, status: 401 });
            assert.equal((await request('/customer-auth/session', { auth: customerToken })).customer.id, customerId);
        });
        await check('Authentication, store creation and role isolation', async () => { assert((await request('/auth/me')).store.id === store.id); await request('/stores/me', { auth: null, status: 401 }); await request('/platform/overview', { status: 403 }); });
        await check('Password changes require authentication, current password and valid confirmation', async () => {
            const before = (await db.user.findUniqueOrThrow({ where: { id: account.user.id } })).password;
            const data = { currentPassword: 'FeatureQApassword123', newPassword: 'UpdatedQApassword456', confirmPassword: 'UpdatedQApassword456' };
            await request('/auth/password', { method: 'POST', auth: null, data, status: 401 });
            const wrong = await request('/auth/password', { method: 'POST', data: { ...data, currentPassword: 'IncorrectQApassword' }, status: 400 });
            assert.equal(wrong.error, 'Current password is incorrect');
            await request('/auth/password', { method: 'POST', data: { ...data, confirmPassword: 'DifferentQApassword' }, status: 400 });
            await request('/auth/password', { method: 'POST', data: { ...data, newPassword: 'short', confirmPassword: 'short' }, status: 400 });
            await request('/auth/password', { method: 'POST', data: { ...data, newPassword: data.currentPassword, confirmPassword: data.currentPassword }, status: 400 });
            await request('/auth/password', { method: 'POST', data: { ...data, newPassword: '🔒'.repeat(20), confirmPassword: '🔒'.repeat(20) }, status: 400 });
            assert.equal((await db.user.findUniqueOrThrow({ where: { id: account.user.id } })).password, before);
            assert.equal((await request('/auth/me')).user.id, account.user.id);
        });
        await check('Password updates are hashed, isolated to the signed-in account and work at login', async () => {
            const other = await db.user.create({ data: { email: 'password-isolation@example.test', password: 'unchanged-test-fixture' } });
            const newPassword = 'UpdatedQApassword456';
            const result = await request('/auth/password', { method: 'POST', data: { currentPassword: 'FeatureQApassword123', newPassword, confirmPassword: newPassword, userId: other.id } });
            assert.equal(result.message, 'Password updated successfully');
            assert.equal(result.password, undefined);
            await request('/auth/me', { status: 401 });
            token = result.token;
            assert.equal((await request('/auth/me')).user.id, account.user.id);
            const hash = (await db.user.findUniqueOrThrow({ where: { id: account.user.id } })).password;
            assert.notEqual(hash, newPassword);
            assert(await apiRequire('bcryptjs').compare(newPassword, hash));
            assert.equal((await db.user.findUniqueOrThrow({ where: { id: other.id } })).password, other.password);
            await request('/auth/login', { method: 'POST', auth: null, data: { email: account.user.email, password: 'FeatureQApassword123' }, status: 401 });
            const login = await request('/auth/login', { method: 'POST', auth: null, data: { email: account.user.email, password: newPassword } });
            assert.equal(login.user.id, account.user.id);
            token = login.token;
            token = (await request('/auth/password', { method: 'POST', data: { currentPassword: newPassword, newPassword: 'FeatureQApassword123', confirmPassword: 'FeatureQApassword123' } })).token;
        });
        await check('Feature module guards and unavailable modules', async () => { for (const route of ['/shipping/zones', '/discounts', '/inventory', '/customers', '/analytics'])
            await request(route, { status: 403 }); await request('/stores/me/modules/catalog', { method: 'PUT', data: { enabled: false }, status: 400 }); for (const key of ['reviews', 'blog'])
            await request(`/stores/me/modules/${key}`, { method: 'PUT', data: { enabled: true }, status: 400 }); });
        await check('Unknown and inherited module keys are rejected', async () => { for (const key of ['unknown', 'constructor', 'toString'])
            await request(`/stores/me/modules/${key}`, { method: 'PUT', data: { enabled: false }, status: 404 }); });
        for (const key of ['customers', 'shipping', 'discounts', 'inventory', 'analytics'])
            await request(`/stores/me/modules/${key}`, { method: 'PUT', data: { enabled: true } });
        await request('/stores/me', { method: 'PATCH', data: { status: 'live', taxBps: 500 } });
        await check('Simple products save without variants and can add or remove options', async () => {
            const item = await request('/products', { method: 'POST', status: 201, data: { name: 'Fish QA', description: 'fish', category: 'fish', price: '150', compareAtPrice: '1800', quantity: 1000, options: [], variants: variantCombinations([]) } });
            assert.equal(item.quantity, 1000);
            assert.equal(item.priceCents, 15000);
            assert.equal(item.compareAtPriceCents, 180000);
            assert.deepEqual(item.variants, []);
            const options = [{ name: 'Size', values: ['Small', 'Large'] }];
            const withOptions = await request(`/products/${item.id}`, { method: 'PATCH', data: { options, variants: variantCombinations(options).map(optionValues => ({ optionValues, quantity: 5 })) } });
            assert.equal(withOptions.variants.length, 2);
            const simpleAgain = await request(`/products/${item.id}`, { method: 'PATCH', data: { options: [], variants: variantCombinations([]), quantity: 1000 } });
            assert.deepEqual(simpleAgain.options, []);
            assert.deepEqual(simpleAgain.variants, []);
            assert.equal(simpleAgain.quantity, 1000);
            await request(`/products/${item.id}`, { method: 'DELETE' });
        });
        await check('Store settings validate supported tax rates', async () => { await request('/stores/me', { method: 'PATCH', data: { taxBps: 5000 } }); await request('/stores/me', { method: 'PATCH', data: { taxBps: 5001 }, status: 400 }); await request('/stores/me', { method: 'PATCH', data: { taxBps: 500 } }); });
        product = await request('/products', { method: 'POST', status: 201, data: { name: 'QA Everyday item', price: '1000.50', compareAtPrice: '1200.00', quantity: 200, category: 'Essentials', images: [] } });
        variant = await request('/products', { method: 'POST', status: 201, data: { name: 'QA Variant item', price: '2000.00', quantity: 0, category: 'Options', options: [{ name: 'Size', values: ['Small', 'Large'] }], variants: [{ optionValues: { Size: 'Small' }, price: '1500.25', quantity: 5 }, { optionValues: { Size: 'Large' }, price: '2500.75', quantity: 7 }] } });
        await request('/products', { method: 'POST', status: 201, data: { name: 'QA Hidden draft', price: '500.00', quantity: 2, status: 'draft' } });
        await check('Product creation, search, filtering, variants and draft visibility', async () => { assert.equal(product.priceCents, 100050); assert.equal(variant.variants.length, 2); const all = await request(`/products/store/${store.slug}`, { auth: null }); assert.equal(all.length, 2); assert.equal((await request(`/products/store/${store.slug}?category=Options`, { auth: null })).length, 1); assert.equal((await request(`/products/store/${store.slug}/search?q=everyday`, { auth: null }))[0].id, product.id); assert.equal((await request(`/products/store/${store.slug}/${variant.slug}`, { auth: null })).product.variants.length, 2); });
        await check('Inventory adjustments, low-stock data and negative-stock prevention', async () => { assert.equal((await request('/inventory')).rows.length, 4); await request('/inventory/adjust', { method: 'POST', data: { productId: product.id, mode: 'add', amount: 1, reason: 'restock' } }); await request('/inventory/adjust', { method: 'POST', data: { productId: product.id, mode: 'set', amount: -1, reason: 'correction' }, status: 400 }); await request('/inventory/adjust', { method: 'POST', data: { productId: product.id, mode: 'add', amount: -10000, reason: 'damaged' }, status: 409 }); assert((await request('/inventory/history')).length >= 4); await request('/stores/me/modules/inventory', { method: 'PUT', data: { enabled: false }, status: 409 }); });
        zone = await request('/shipping/zones', { method: 'POST', status: 201, data: { name: 'Colombo QA', districts: ['Colombo'], rate: '350.00', freeOver: '5000.00', estimatedDays: '2–3 days' } });
        await check('Shipping rates, district coverage and overlap prevention', async () => { await request('/shipping/zones', { method: 'POST', status: 409, data: { name: 'Overlap', districts: ['Colombo'], rate: '10' } }); const quote = await request(`/stores/${store.slug}/quote`, { method: 'POST', auth: null, data: { subtotalCents: 100050, district: 'Colombo' } }); assert.equal(quote.shippingCents, 35000); const free = await request(`/stores/${store.slug}/quote`, { method: 'POST', auth: null, data: { subtotalCents: 500000, district: 'Colombo' } }); assert.equal(free.shippingCents, 0); await request(`/stores/${store.slug}/quote`, { method: 'POST', auth: null, data: { subtotalCents: 100050, district: 'Kandy' }, status: 409 }); });
        const discount = await request('/discounts', { method: 'POST', status: 201, data: { title: 'Ten percent QA', code: 'QA10', type: 'percent', value: '10' } });
        await check('Percent, fixed, automatic and free-delivery discounts', async () => { const q = await request(`/stores/${store.slug}/quote`, { method: 'POST', auth: null, data: { subtotalCents: 100050, district: 'Colombo', code: 'QA10' } }); assert.equal(q.discountCents, 10005); const fixed = await request('/discounts', { method: 'POST', status: 201, data: { title: 'Automatic QA', type: 'fixed', value: '200' } }); const best = await request(`/stores/${store.slug}/quote`, { method: 'POST', auth: null, data: { subtotalCents: 100050, district: 'Colombo', code: 'QA10' } }); assert.equal(best.discountCents, 20000); await request(`/discounts/${fixed.id}`, { method: 'DELETE' }); const free = await request('/discounts', { method: 'POST', status: 201, data: { title: 'Delivery QA', code: 'QAFREE', type: 'free_shipping' } }); assert.equal((await request(`/stores/${store.slug}/quote`, { method: 'POST', auth: null, data: { subtotalCents: 100050, district: 'Colombo', code: 'QAFREE' } })).shippingCents, 0); await request(`/discounts/${free.id}`, { method: 'DELETE' }); });
        await check('COD totals, tax, discounts, stock reservation and cancellation', async () => { const before = (await request(`/products/${product.id}`)).quantity; const order = await request('/orders', { method: 'POST', auth: customerToken, status: 201, data: checkout(undefined, { discountCode: 'QA10', subtotalCents: 1, email: 'spoofed@example.test', customerId: 'untrusted-customer' }) }); assert.equal(order.subtotalCents, 100050); assert.equal(order.discountCents, 10005); assert.equal(order.taxCents, 4502); assert.equal(order.totalCents, 129547); assert.equal((await request(`/products/${product.id}`)).quantity, before - 1); await request(`/orders/${order.id}/status`, { method: 'PATCH', data: { status: 'cancelled' } }); assert.equal((await request(`/products/${product.id}`)).quantity, before); assert.equal((await request('/discounts')).find(d => d.id === discount.id).usedCount, 0); });
        await check('Variant checkout requires an option and uses variant price', async () => { await request('/orders', { method: 'POST', auth: customerToken, status: 400, data: checkout([{ productId: variant.id, quantity: 1 }]) }); const order = await request('/orders', { method: 'POST', auth: customerToken, status: 201, data: checkout([{ productId: variant.id, variantId: variant.variants[0].id, quantity: 1 }]) }); assert.equal(order.subtotalCents, 150025); await request(`/orders/${order.id}/status`, { method: 'PATCH', data: { status: 'cancelled' } }); });
        await check('Last-unit concurrency cannot oversell', async () => { const last = await request('/products', { method: 'POST', status: 201, data: { name: 'Last unit', price: '100', quantity: 1 } }); const orders = await Promise.all([0, 1].map(() => fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` }, body: JSON.stringify(checkout([{ productId: last.id, quantity: 1 }])) }))); checkoutRequests += 2; assert.deepEqual(orders.map(r => r.status).sort(), [201, 409]); for (const response of orders)
            if (response.status === 201) {
                const order = await response.json();
                await request(`/orders/${order.id}/status`, { method: 'PATCH', data: { status: 'cancelled' } });
            } });
        await check('COD payment, platform fee ledger and duplicate-payment protection', async () => { const order = await request('/orders', { method: 'POST', auth: customerToken, status: 201, data: checkout() }); const paid = await request(`/orders/${order.id}/mark-paid`, { method: 'POST' }); assert.equal(paid.paymentStatus, 'paid'); assert.equal(paid.platformFeeCents, 10005); await request(`/orders/${order.id}/mark-paid`, { method: 'POST', status: 409 }); const balance = await request('/payouts/balance'); assert.equal(balance.balanceCents, -10005); assert.equal(balance.entries.filter(e => e.type === 'platform_fee').length, 1); await request(`/orders/${order.id}/status`, { method: 'PATCH', status: 409, data: { status: 'cancelled' } }); await request(`/orders/${order.id}/status`, { method: 'PATCH', data: { status: 'confirmed', fulfillmentStatus: 'shipped', courier: 'QA', trackingNumber: 'QA-001' } }); });
        await check('Customer history, newsletter deduplication and analytics', async () => { for (let n = 0; n < 2; n++)
            await request(`/stores/${store.slug}/subscribers`, { method: 'POST', auth: null, status: 201, data: { email: 'newsletter@example.test' } }); for (const type of ['page_view', 'product_view', 'add_to_cart', 'checkout_start'])
            await request(`/stores/${store.slug}/events`, { method: 'POST', auth: null, status: 202, data: { type, sessionId: 'feature-qa-session', path: '/qa', productId: product.id } }); const customers = await request('/customers'); assert.equal(customers.subscriberCount, 1); assert(customers.customers[0].orderCount >= 1); const analytics = await request('/analytics?days=7'); assert.equal(analytics.days, 7); assert(analytics.summary.orders >= 1); assert(analytics.summary.visitors >= 1); assert.equal((await request('/dashboard/stats')).platformFeesCents, 10005); });
        await check('Image upload, public retrieval and unsupported-format rejection', async () => { const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64'); const image = await request('/uploads', { method: 'POST', status: 201, raw: bytes, headers: { 'Content-Type': 'image/png' } }); assert((await fetch(image.url)).ok); await request('/uploads', { method: 'POST', raw: Buffer.from('<svg/>'), headers: { 'Content-Type': 'image/svg+xml' }, status: 415 }); });
        await check('Tenant isolation for products, pages and checkout', async () => { const other = await request('/auth/register', { method: 'POST', auth: null, status: 201, data: { email: 'other@example.test', password: 'FeatureQApassword123', storeName: 'Other QA', storeSlug: 'other-qa' } }); await request(`/products/${product.id}`, { auth: other.token, status: 404 }); const ownCatalog = await request('/stores/me/pages/__products'); const otherCatalog = await request('/stores/me/pages/__products', { auth: other.token }); assert.equal(otherCatalog.storeId, other.store.id); assert.notEqual(otherCatalog.id, ownCatalog.id); await request('/orders', { method: 'POST', auth: customerToken, status: 400, data: checkout([{ productId: 'not-this-store', quantity: 1 }]) }); });
        await check('Malformed page section types return validation errors without changing content', async () => {
            const before = await request('/stores/me/pages/home');
            for (const type of ['constructor', 'toString', '__proto__']) {
                await request('/stores/me/pages/home', { method: 'PUT', status: 400, data: { sections: [{ id: 'bad-section', type, props: {} }] } });
            }
            assert.deepEqual((await request('/stores/me/pages/home')).draftSections, before.draftSections);
        });
        for (const key of TEMPLATE_KEYS) {
            const template = TEMPLATES[key];
            let passed = false;
            const before = results.checks.length;
            await check(`Template ${key} (${template.industry}): apply, page editing, navigation, catalog and COD`, async () => { const applied = await request('/stores/me/template', { method: 'POST', data: { key, replacePages: true } }); assert.equal(applied.templateKey, key); const publicStore = await request(`/stores/${store.slug}`, { auth: null }); for (const link of pageNavigation(publicStore.pages)) { const destination = publicStore.pages.find(page => pagePath(page.slug) === link.link); assert(destination); assert((await request(`/stores/${store.slug}/pages/${destination.slug}`, { auth: null })).sections.length); } await request('/stores/me/pages/prepare', { method: 'POST' }); const pages = await request('/stores/me/pages'); assert(pages.some(p => p.slug === PRODUCTS_PAGE_SLUG)); assert(pages.some(p => p.slug === 'about')); const home = await request('/stores/me/pages/home'); assert(home.draftSections.length); await request('/stores/me/pages/home', { method: 'PUT', data: { sections: home.draftSections, title: home.title } }); await request('/stores/me/pages/home/publish', { method: 'POST' }); const published = await request(`/stores/${store.slug}/pages/home`, { auth: null }); assert.deepEqual(published.sections, home.draftSections); const catalog = await request(`/stores/me/pages/${PRODUCTS_PAGE_SLUG}`); await request(`/stores/me/pages/${PRODUCTS_PAGE_SLUG}`, { method: 'PUT', data: { title: 'Products', sections: defaultCatalogSections() } }); const story = await request('/stores/me/pages/about'); await request('/stores/me/pages/about', { method: 'PUT', data: { title: story.title, sections: story.draftSections } }); await request('/stores/me/pages/prepare', { method: 'POST' }); assert.equal((await request(`/stores/me/pages/${PRODUCTS_PAGE_SLUG}`)).id, catalog.id); assert((await request(`/products/store/${store.slug}`, { auth: null })).some(p => p.id === product.id)); const order = await request('/orders', { method: 'POST', auth: customerToken, status: 201, data: checkout() }); assert.equal(order.subtotalCents, 100050); await request(`/orders/${order.id}/status`, { method: 'PATCH', data: { status: 'cancelled' } }); passed = true; });
            results.templates.push({ key, category: template.industry, status: passed ? 'passed' : 'failed' });
        }
        await check('Every shop category is covered by the template matrix', async () => { assert.deepEqual([...new Set(results.templates.map(t => t.category))].sort(), [...SHOP_TYPES].sort()); });
        await check('Page starters, publishing, category scope and automatic navigation', async () => {
            for (const preset of ['contact', 'story', 'category']) {
                const slug = `preset-${preset}`;
                const page = await request('/stores/me/pages', { method: 'POST', status: 201, data: { title: `QA ${preset}`, slug, preset, ...(preset === 'category' ? { category: 'options' } : {}) } });
                assert(page.draftSections.length);
                assert(!pageNavigation((await request(`/stores/${store.slug}`, { auth: null })).pages).some(link => link.slug === slug));
                await request(`/stores/me/pages/${slug}/publish`, { method: 'POST' });
                assert(pageNavigation((await request(`/stores/${store.slug}`, { auth: null })).pages).some(link => link.link === `/pages/${slug}`));
                if (preset === 'category') {
                    const published = await request(`/stores/${store.slug}/pages/${slug}`, { auth: null });
                    const query = productQueries(published.sections)[0];
                    assert.equal(query.category, 'options');
                    const items = await request(`/products/store/${store.slug}?category=${query.category}`, { auth: null });
                    assert.equal(items.length, 1);
                    assert.equal(items[0].id, variant.id);
                }
                await request(`/stores/me/pages/${slug}/navigation`, { method: 'PATCH', data: { showInNavigation: false } });
                assert(!pageNavigation((await request(`/stores/${store.slug}`, { auth: null })).pages).some(link => link.slug === slug));
                await request(`/stores/me/pages/${slug}`, { method: 'DELETE' });
                assert(!(await request(`/stores/${store.slug}`, { auth: null })).pages.some(page => page.slug === slug));
            }
            await request('/stores/me/pages', { method: 'POST', status: 400, data: { title: 'Missing category', preset: 'category' } });
        });
        await check('Navigation reorders real tenant pages and preparation respects deleted pages', async () => {
            const all = await request('/stores/me/pages');
            const slugs = all.map(page => page.slug).reverse();
            await request('/stores/me/pages/navigation/order', { method: 'PUT', data: { slugs } });
            assert.deepEqual((await request('/stores/me/pages')).map(page => page.slug), slugs);
            await request('/stores/me/pages/navigation/order', { method: 'PUT', data: { slugs: [...slugs, 'not-this-stores-page'] }, status: 400 });
            await request('/stores/me/pages/navigation/order', { method: 'PUT', data: { slugs: [slugs[0], slugs[0]] }, status: 400 });
            await request('/stores/me/pages/about', { method: 'DELETE' });
            await request('/stores/me/pages/prepare', { method: 'POST' });
            await request('/stores/me/pages/about', { status: 404 });
            await request('/stores/me/pages', { method: 'POST', status: 201, data: { title: 'Our story', slug: 'about', preset: 'story' } });
        });
        await check('Pages: draft isolation, publishing, linked destinations and protected catalog', async () => { const sections = [createSection('link-strip', { items: [{ label: 'Shop', link: '/products' }, { label: 'Our story', link: '/pages/about' }] })]; const page = await request('/stores/me/pages', { method: 'POST', status: 201, data: { title: 'Linked QA', slug: 'linked-qa', sections } }); await request(`/stores/${store.slug}/pages/linked-qa`, { auth: null, status: 404 }); await request('/stores/me/pages/linked-qa/publish', { method: 'POST' }); assert.deepEqual((await request(`/stores/${store.slug}/pages/linked-qa`, { auth: null })).sections, sections); await request('/stores/me/pages/linked-qa', { method: 'PUT', data: { sections: [createSection('rich-text', { heading: 'Unpublished QA' })] } }); assert.deepEqual((await request(`/stores/${store.slug}/pages/linked-qa`, { auth: null })).sections, sections); await request('/stores/me/pages/__products', { method: 'DELETE', status: 400 }); await request('/stores/me/pages/linked-qa', { method: 'DELETE' }); });
        await check('Product edits, price/stock changes and deletion', async () => {
            const item = await request('/products', { method: 'POST', status: 201, data: { name: 'Editable QA item', price: '100.25', quantity: 3, category: 'QA' } });
            const edited = await request(`/products/${item.id}`, { method: 'PATCH', data: { name: 'Updated QA item', price: '140.75', quantity: 5, sku: 'QA-EDIT', category: 'Updated' } });
            assert.equal(edited.priceCents, 14075); assert.equal(edited.quantity, 5); assert.equal(edited.sku, 'QA-EDIT');
            assert.equal((await request(`/products/store/${store.slug}/${item.slug}`, { auth: null })).product.name, 'Updated QA item');
            await request(`/products/${item.id}`, { method: 'DELETE' }); await request(`/products/${item.id}`, { status: 404 });
        });
        await check('Shipping zone edits and deletion', async () => {
            const created = await request('/shipping/zones', { method: 'POST', status: 201, data: { name: 'Editable zone', districts: ['Kandy'], rate: '100' } });
            await request(`/shipping/zones/${created.id}`, { method: 'PUT', data: { name: 'Updated zone', districts: ['Matale'], rate: '200' } });
            const quote = await request(`/stores/${store.slug}/quote`, { method: 'POST', auth: null, data: { subtotalCents: 100050, district: 'Matale' } });
            assert.equal(quote.shippingCents, 20000); await request(`/shipping/zones/${created.id}`, { method: 'DELETE' });
            assert(!(await request('/shipping/zones')).some(zone => zone.id === created.id));
        });
        await check('Discount edits, minimum spend, inactive codes and deletion', async () => {
            const created = await request('/discounts', { method: 'POST', status: 201, data: { title: 'Editable discount', code: 'QAEDIT', type: 'fixed', value: '150' } });
            const data = { title: 'Updated discount', code: 'QAEDIT', type: 'fixed', value: '250', minSubtotal: '500', active: true };
            await request(`/discounts/${created.id}`, { method: 'PUT', data });
            const quote = subtotalCents => request(`/stores/${store.slug}/quote`, { method: 'POST', auth: null, status: subtotalCents < 50000 ? 409 : 200, data: { subtotalCents, district: 'Colombo', code: 'QAEDIT' } });
            await quote(40000); assert.equal((await quote(100050)).discountCents, 25000);
            await request(`/discounts/${created.id}`, { method: 'PUT', data: { ...data, active: false } });
            await request(`/stores/${store.slug}/quote`, { method: 'POST', auth: null, status: 409, data: { subtotalCents: 100050, district: 'Colombo', code: 'QAEDIT' } });
            await request(`/discounts/${created.id}`, { method: 'DELETE' });
        });
        await check('Discount usage limits hold under concurrent orders and cancellation releases use', async () => {
            const discount = await request('/discounts', { method: 'POST', status: 201, data: { title: 'One use QA', code: 'QAONCE', type: 'percent', value: '5', usageLimit: 1 } });
            const responses = await Promise.all([0, 1].map(() => fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` }, body: JSON.stringify(checkout(undefined, { discountCode: 'QAONCE' })) })));
            checkoutRequests += 2; assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
            for (const response of responses) if (response.status === 201) { const order = await response.json(); await request(`/orders/${order.id}/status`, { method: 'PATCH', data: { status: 'cancelled' } }); }
            assert.equal((await request('/discounts')).find(item => item.id === discount.id).usedCount, 0);
            await request(`/discounts/${discount.id}`, { method: 'DELETE' });
        });
        await check('Optional modules can be switched off and back on without deleting data', async () => {
            for (const [key, route] of [['customers', '/customers'], ['shipping', '/shipping/zones'], ['discounts', '/discounts'], ['analytics', '/analytics']]) {
                await request(`/stores/me/modules/${key}`, { method: 'PUT', data: { enabled: false } });
                await request(route, { status: 403 }); await request(`/stores/me/modules/${key}`, { method: 'PUT', data: { enabled: true } }); await request(route);
            }
            assert.equal((await request('/shipping/zones')).find(item => item.id === zone.id).rateCents, 35000);
        });
        await check('Changing a theme preserves pages unless replacement is requested', async () => {
            const home = await request('/stores/me/pages/home');
            const sections = [...home.draftSections, createSection('rich-text', { heading: 'Preserve QA content' }, 'preserve-qa')];
            await request('/stores/me/pages/home', { method: 'PUT', data: { title: home.title, sections } });
            await request('/stores/me/template', { method: 'POST', data: { key: 'classic', replacePages: false } });
            assert.deepEqual((await request('/stores/me/pages/home')).draftSections, sections);
            await request('/stores/me/template', { method: 'POST', data: { key: 'classic', replacePages: true } });
            assert.deepEqual((await request('/stores/me/pages/home')).draftSections, TEMPLATES.classic.pages[0].sections);
        });
        await check('Draft stores reject checkout until opened', async () => {
            await request('/stores/me', { method: 'PATCH', data: { status: 'draft' } });
            await request('/orders', { method: 'POST', auth: customerToken, status: 409, data: checkout() });
            await request('/stores/me', { method: 'PATCH', data: { status: 'live' } });
        });
        await check('Orders use the verified account email, maintain delivery details and expose only private customer history', async () => {
            const ownOrders = await request('/customer-auth/orders', { auth: customerToken });
            assert(ownOrders.orders.length > 0);
            const stored = await db.order.findMany({ where: { storeId: store.id, customerId } });
            assert.deepEqual(ownOrders.orders.map(order => order.id).sort(), stored.map(order => order.id).sort());
            for (const order of ownOrders.orders) {
                assert.equal(order.platformFeeCents, undefined);
                assert.equal(order.customer, undefined);
            }
            const delivery = await db.shippingAddress.findMany({ where: { order: { storeId: store.id, customerId } } });
            assert(delivery.every(address => address.email === 'customer@example.test'));
            const profile = (await request('/customer-auth/session', { auth: customerToken })).customer;
            assert.equal(profile.savedAddress.line1, shippingAddress.line1);
            const other = await request('/customer-auth/google', { method: 'POST', auth: null, data: { storeSlug: store.slug, idToken: googleToken({ sub: 'google-other-customer', email: 'other-customer@example.test' }), nonce: googleNonce } });
            assert.deepEqual((await request('/customer-auth/orders', { auth: other.token })).orders, []);
            assert.equal(other.customer.savedAddress, null);
            await request('/customer-auth/session', { method: 'DELETE', auth: other.token });
            const otherStore = await db.store.findUniqueOrThrow({ where: { slug: 'other-qa' } });
            await request('/orders', { method: 'POST', auth: customerToken, headers: { 'X-Store-Slug': otherStore.slug }, status: 403, data: { ...checkout(), storeSlug: otherStore.slug } });
        });
        await check('Expired sessions and conflicting Google identities cannot take over customer accounts', async () => {
            const extra = await request('/customer-auth/google', { method: 'POST', auth: null, data: { storeSlug: store.slug, idToken: googleToken(), nonce: googleNonce } });
            await db.customerSession.updateMany({ where: { tokenHash: createHash('sha256').update(extra.token).digest('hex') }, data: { expiresAt: new Date(0) } });
            await request('/customer-auth/session', { auth: extra.token, status: 401 });
            await request('/orders', { method: 'POST', auth: extra.token, data: checkout(), status: 401 });
            await request('/customer-auth/google', { method: 'POST', auth: null, status: 409, data: { storeSlug: store.slug, idToken: googleToken({ sub: 'different-subject-same-email' }), nonce: googleNonce } });
            assert.equal((await request('/customer-auth/session', { auth: customerToken })).customer.id, customerId);
        });
        await check('Storefront cookie proxy enforces origin checks and isolates sessions without exposing tokens', async () => {
            process.env.API_URL = `${base}/api`;
            const { customerProxy } = await import('../apps/storefront/src/lib/customer-server.ts');
            const { NextRequest } = createRequire(path.join(root, 'apps/storefront/package.json'))('next/server');
            const url = `http://storefront.example/api/customer/${store.slug}`;
            const headers = { cookie: `customer-session-${store.slug}=${customerToken}` };
            const session = await customerProxy(new NextRequest(`${url}/session`, { headers }), store.slug, 'session');
            assert.equal(session.status, 200);
            const body = await session.json();
            assert.equal(body.customer.id, customerId);
            assert.equal(body.token, undefined);
            assert.equal(session.headers.get('cache-control'), 'no-store');
            const missing = await customerProxy(new NextRequest(`${url}/session`), store.slug, 'session');
            assert.equal(missing.status, 200);
            assert.equal((await missing.json()).customer, null);
            const csrf = await customerProxy(new NextRequest(`${url}/profile`, { method: 'PATCH', headers: { ...headers, origin: 'https://attacker.example', 'Content-Type': 'application/json' }, body: '{}' }), store.slug, 'profile');
            assert.equal(csrf.status, 403);
            const malformed = await customerProxy(new NextRequest(`${url}/profile`, { method: 'PATCH', headers: { ...headers, origin: 'http://storefront.example', 'Content-Type': 'application/json' }, body: '{' }), store.slug, 'profile');
            assert.equal(malformed.status, 400);
            const wrongStore = await customerProxy(new NextRequest('http://storefront.example/api/customer/other-qa/session', { headers: { cookie: `customer-session-other-qa=${customerToken}` } }), 'other-qa', 'session');
            assert.equal(wrongStore.status, 403);
        });
        await check('Platform admin reporting, suspension, fee payments and audit logs', async () => { const bcrypt = apiRequire('bcryptjs'); await db.user.create({ data: { email: 'admin@example.test', password: await bcrypt.hash('FeatureQApassword123', 10), role: 'platform_admin' } }); adminToken = (await request('/auth/login', { method: 'POST', auth: null, data: { email: 'admin@example.test', password: 'FeatureQApassword123' } })).token; await request('/platform/overview', { auth: adminToken }); await request('/platform/stores', { auth: adminToken }); await request(`/platform/stores/${store.id}`, { auth: adminToken }); await request(`/platform/stores/${store.id}`, { method: 'PATCH', auth: adminToken, data: { status: 'suspended', reason: 'Isolated verification' } }); await request(`/stores/${store.slug}`, { auth: null, status: 404 }); await request(`/platform/stores/${store.id}`, { method: 'PATCH', auth: adminToken, data: { status: 'live', reason: 'Isolated verification complete' } }); const balance = await request(`/platform/stores/${store.id}/ledger`, { method: 'POST', auth: adminToken, status: 201, data: { kind: 'fee_payment', amount: '100.05', reference: 'QA-only-receipt' } }); assert.equal(balance.balanceCents, 0); assert((await request('/platform/audit', { auth: adminToken })).length >= 3); });
        await check('Oversized prices and invalid catalog limits return validation errors', async () => {
            for (const limit of ['-1', '1.5', 'Infinity', 'abc', '101']) await request(`/products/store/${store.slug}?limit=${limit}`, { auth: null, status: 400 });
            await request('/products', { method: 'POST', data: { name: 'Too expensive', price: '9999999999999999999999' }, status: 400 });
            await request('/auth/register', { method: 'POST', auth: null, data: { email: 'long-password@example.test', password: '🔒'.repeat(20), storeName: 'Password QA', storeSlug: 'password-qa' }, status: 400 });
        });
        await check('Concurrent cancellations restore inventory only once', async () => {
            const login = await request('/customer-auth/google', { method: 'POST', auth: null, data: { storeSlug: store.slug, idToken: googleToken({ sub: 'race-customer', email: 'race@example.test' }), nonce: googleNonce } });
            const before = (await request(`/products/${product.id}`)).quantity;
            const order = await request('/orders', { method: 'POST', auth: login.token, status: 201, data: checkout() });
            await Promise.all(Array.from({ length: 3 }, () => request(`/orders/${order.id}/status`, { method: 'PATCH', data: { status: 'cancelled' } })));
            assert.equal((await request(`/products/${product.id}`)).quantity, before);
            assert.equal(await db.inventoryAdjustment.count({ where: { productId: product.id, note: `Order #${order.orderNumber}`, reason: 'cancellation' } }), 1);
        });
        await check('Concurrent fee payments cannot over-credit the ledger', async () => {
            await db.ledgerEntry.create({ data: { storeId: store.id, type: 'platform_fee', amountCents: -10000, currency: 'LKR', key: 'race-test-fee' } });
            const responses = await Promise.all(Array.from({ length: 2 }, (_, i) => fetch(`${base}/api/platform/stores/${store.id}/ledger`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'fee_payment', amount: '100', reference: `race-${i}` }) })));
            assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
            assert.equal((await db.ledgerEntry.aggregate({ where: { storeId: store.id }, _sum: { amountCents: true } }))._sum.amountCents, 0);
        });
        await check('Concurrent shipping-zone creation cannot assign the same district twice', async () => {
            const responses = await Promise.all(Array.from({ length: 2 }, (_, i) => fetch(`${base}/api/shipping/zones`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `Race zone ${i}`, districts: ['Jaffna'], rate: '100' }) })));
            assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
        });
        await check('Concurrent absolute stock counts are serialized', async () => {
            await Promise.all(Array.from({ length: 2 }, () => request('/inventory/adjust', { method: 'POST', data: { productId: product.id, mode: 'set', amount: 123, reason: 'correction' } })));
            assert.equal((await request(`/products/${product.id}`)).quantity, 123);
        });
        results.checkoutRequests = checkoutRequests;
    }
    catch (error) {
        results.checks.push({ name: 'Audit setup or prerequisite', status: 'failed', error: error.message });
        console.error(error.message);
    }
    finally {
        if (server && server.exitCode === null) {
            const exited = once(server, 'exit');
            server.kill('SIGTERM');
            await Promise.race([exited, delay(3000)]);
            if (server.exitCode === null)
                server.kill('SIGKILL');
        }
        if (db)
            await db.$disconnect();
        if (admin && databaseCreated) {
            await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
            await admin.$disconnect();
            results.temporaryDatabaseRemoved = true;
        }
        if (workspace)
            await rm(workspace, { recursive: true, force: true });
        results.finishedAt = new Date().toISOString();
        results.passed = results.checks.filter(c => c.status === 'passed').length;
        results.failed = results.checks.filter(c => c.status === 'failed').length;
        await writeFile(process.env.FEATURE_REPORT_PATH || path.join(tmpdir(), 'ecommerce-feature-results.json'), JSON.stringify(results, null, 2));
        console.log(`RESULT ${results.passed} passed, ${results.failed} failed; disposable database removed: ${!!results.temporaryDatabaseRemoved}`);
        if (results.failed)
            process.exitCode = 1;
    }
}
await main();
