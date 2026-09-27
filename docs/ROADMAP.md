# Roadmap

A Shopify-style platform for Sri Lankan merchants: sign up, pick a template,
customise the storefront with a section builder, add products, sell on your own
domain. The platform handles payments, orders and delivery, and keeps **10% of
each order's goods subtotal** (tax and delivery are pass-through).

## Architecture at a glance

| Piece | What it is |
| --- | --- |
| `apps/api` | Express + Prisma. Routes in `src/routes`, business rules in `src/services`. |
| `apps/dashboard` | Next.js merchant admin. Navigation should come from the store's enabled modules. |
| `apps/storefront` | Next.js customer storefront. Resolves a store by `?store=slug` today, custom domain later. |
| `packages/core` | Shared, dependency-free: money maths, module registry, section definitions, templates. |
| `packages/database` | Prisma schema, migrations, seed. |

Key decisions:

- **Money is integer cents** (`*Cents` columns), rates are basis points (`*Bps`). `@repo/core/money.ts` is the only place that does the maths.
- **Pages are data.** A page is an ordered list of sections (`@repo/core/sections.ts`), validated on save. Merchants edit a draft; publishing copies it to what customers see.
- **Templates are starting points.** Applying one copies its theme and pages into the store; after that the merchant owns their copy.
- **Features are modules.** Core modules are always on; optional ones are rows in `StoreModule`. The API guards module routes with `requireModule`, and the admin nav is `adminNav(enabled)`.
- **The ledger is the source of truth for money owed.** Every sale, fee, refund and payout is an append-only `LedgerEntry` with an idempotency key. A store's balance is the sum.

### How the 10% works in Sri Lanka

There's no Stripe Connect-style automatic split, so the platform collects and settles:

- **Card (PayHere):** the customer pays the platform's PayHere account. On the verified payment notification we post `+total` (sale) and `−fee` (platform_fee). The merchant is paid the balance by bank transfer on a payout schedule.
- **Cash on delivery:** the merchant (or courier) holds the cash, so we only post `−fee`. The merchant's balance goes negative and is netted against future card sales or invoiced.

> ⚠️ Collecting customer money and paying it on to merchants may count as payment
> aggregation under CBSL rules. Get this checked before taking live card payments.
> PayHere's marketplace/sub-merchant options, if available for your account, may avoid it.

## Phases

### ✅ Phase 0: Foundation (done)
- Schema rebuilt: integer money, per-store order numbers, order item snapshots, payments, payment events, ledger, payouts, pages, modules, domains.
- API split into routes and services, with zod validation on every body.
- Security fixes: the unverified Stripe webhook that let anyone mark orders paid is gone; checkout now checks products belong to the store, rejects bad quantities and reserves stock in a transaction; JWT secret is required; login is rate-limited and timing-safe.
- `.env.local` is actually loaded now (before this, the API silently used a hard-coded JWT secret).
- COD checkout end to end, with the fee posted to the ledger when the merchant marks cash received.
- Three templates (Classic, Boutique, Bazaar) and 8 section types defined in `@repo/core`.

### Phase 1: Store builder (next)
- Storefront renders the home page and custom pages from published sections, with one React component per section type; replaces the hard-coded `[store]/page.tsx`.
- Dashboard "Online store" area: template gallery with previews, section editor (add, reorder, edit fields generated from the section definitions, live preview iframe), publish button, theme colours and fonts.
- Image uploads (S3-compatible storage, e.g. Cloudflare R2) instead of pasted URLs.
- Onboarding flow: sign up → pick template → add first product → go live.
- Admin nav driven by `GET /api/stores/me/modules` and a module picker page.
- Fix the dashboard auth hydration race: a hard reload on any page redirects to /login.

### Phase 2: Payments
- PayHere checkout for cards: create the payment, redirect, verify `notify_url` with the md5 signature, store the raw event in `PaymentEvent`, then call `recordOrderPaid`.
- Refunds (full and partial), with `refund` and `fee_reversal` ledger entries.
- Order emails (confirmation, shipped, delivered) and SMS for Sri Lankan numbers.

### Phase 3: Payouts and platform admin
- Merchant bank details (`PayoutAccount`) with verification.
- Weekly payout run: create a `Payout` for stores with a positive balance, export a bank-transfer file, mark paid with a reference.
- Platform admin app: stores, suspend or unsuspend, fee overrides (`platformFeeBps`), ledger adjustments, revenue report.
- Merchant payouts page (`GET /api/payouts/balance` exists already).

### Phase 4: Delivery and logistics
- `shipping` module: delivery zones by district, flat or weight-based rates, free-delivery thresholds.
- Courier integrations (Domex, Pronto, Koombiyo, etc.): book pickups, print waybills, track, and sync COD remittances back into the ledger.
- Inventory module: variants (size or colour), per-variant stock, low-stock alerts.

### Phase 5: Custom domains and hosting
- Merchant adds a domain → we show the TXT and CNAME records → a background job verifies DNS → issue TLS (Caddy on-demand TLS or Cloudflare for SaaS) → `status = active`.
- Storefront middleware resolves `Host` through `GET /api/stores/by-host/:host` (endpoint exists) with caching.
- Free subdomain for every store (`slug.yourplatform.lk`).
- Production build for the API (bundle with esbuild or tsup, since `@repo/core` ships as TypeScript source), Docker images, CI, backups, error monitoring.

### Phase 6: Growth modules
- Discounts, reviews, analytics, blog, abandoned-cart emails, SEO (sitemaps, meta tags per page).
