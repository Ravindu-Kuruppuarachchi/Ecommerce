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

### ✅ Phase 1: Store builder (done)
- Storefront rebuilt around published sections: home, custom pages (`/pages/<slug>`), catalog with category filters, product pages, checkout. Server-rendered, with a 5-second cache.
- Store theme becomes CSS variables (colours, fonts, header style); button text colour is picked automatically for contrast. Fonts are self-hosted (Fontsource), so builds don't depend on Google Fonts.
- Dashboard "Online store": pages list (add, edit, delete), theme editor with a contrast warning, template gallery (switch theme, optionally replace pages).
- Page editor: add, reorder, duplicate and remove sections; forms generated from the section definitions; image upload; live preview in an iframe (desktop and mobile sizes, click a section to edit it); save a draft, then publish.
- Image uploads (`POST /api/uploads`): PNG, JPEG, WebP and GIF, checked by content, 5 MB limit. Stored on local disk for now.
- Onboarding: template picked at signup, launch checklist on Home, stores start as drafts and can't take orders until the merchant opens them.
- Admin menu built from enabled modules; Features page to switch optional modules; Customers and Payouts pages.
- Newsletter signups stored per store.
- Fixed: a hard refresh no longer logs merchants out.

Carried forward:
- Move uploads to S3-compatible storage (Cloudflare R2) before running more than one API instance.
- Product form still takes image URLs; add the upload button there too.
- Section defaults include placeholder copy ("Tell customers who you are…") that goes live if a merchant publishes without editing.

### ✅ Store features (done, pulled forward from Phases 4 and 6)
- **More design options:** 6 templates (Classic, Boutique, Bazaar, Studio, Market, Noir), theme-wide corner style, button style, product image shape and quick-add; per-section colour schemes (page, subtle, accent, inverted); new sections: questions and answers, selling points, promo tiles.
- **Shipping and delivery:** zones built from the 25 districts with a fee, free-delivery threshold and delivery estimate. Checkout requires a district and the API prices delivery. Orders store the zone, courier and tracking number.
- **Inventory:** product options and variants with their own stock, SKU and price; an Inventory page with inline stock edits and reasons; every stock movement (sales, cancellations, edits) is logged; low-stock threshold and alerts.
- **Discounts:** percentage, fixed and free-delivery discounts, as codes or automatic, with minimum spend, dates and usage limits. The best single discount applies; usage limits hold under concurrent checkouts; cancelling an order releases its use. The 10% platform fee is charged on goods after discounts.
- **Analytics:** a privacy-light storefront tracker (random per-tab id), plus sales, orders, average order, visitors, conversion, a visit-to-order funnel, top products and sales by district for 7/30/90 days.

Carried forward:
- Courier integrations (Domex, Pronto, Koombiyo): book pickups, print waybills, sync tracking and COD remittances. Needs courier accounts and API access.
- Analytics events are stored raw; roll them up into daily totals once stores get real traffic.
- Customer-facing order status page (using the tracking number).

### ✅ Platform admin (done, first part of Phase 3)
- `platform_admin` users get a separate Platform area (`/platform` in the dashboard). The API re-checks the role from the database on every request.
- Overview: our revenue (paid vs awaiting payment), total sales, orders, visitors, conversion, store counts, signups, onboarding funnel, what merchants owe us and what we owe them, revenue per day, stores needing attention, top stores.
- Stores table with period metrics, balance and fee rate; search, status filter, sorting and CSV export.
- Store detail: trends, features in use, recent orders, ledger, and actions: suspend or reactivate, change fee rate (future orders only), record a fee payment or a payout. Every action needs a reason and goes to the audit log.
- Visits are now recorded for every store so the platform sees traffic everywhere; merchants still need the Analytics feature to see their own.

Still to do for Phase 3: merchant bank details and a scheduled payout run, multiple admin roles (support vs finance), and email alerts.

### Phase 2: Payments
- PayHere checkout for cards: create the payment, redirect, verify `notify_url` with the md5 signature, store the raw event in `PaymentEvent`, then call `recordOrderPaid`.
- Refunds (full and partial), with `refund` and `fee_reversal` ledger entries.
- Order emails (confirmation, shipped, delivered) and SMS for Sri Lankan numbers.

### Phase 3: Payouts and platform admin (remaining)
- Merchant bank details (`PayoutAccount`) with verification.
- Weekly payout run: create a `Payout` for stores with a positive balance, export a bank-transfer file, mark paid with a reference.
- Staff roles (support can suspend, finance can record money), and sign-in hardening for staff (2FA).

### Phase 4: Delivery and logistics
- Weight-based delivery rates.
- Courier integrations (Domex, Pronto, Koombiyo, etc.): book pickups, print waybills, track, and sync COD remittances back into the ledger.

### Phase 5: Custom domains and hosting
- Merchant adds a domain → we show the TXT and CNAME records → a background job verifies DNS → issue TLS (Caddy on-demand TLS or Cloudflare for SaaS) → `status = active`.
- Storefront middleware resolves `Host` through `GET /api/stores/by-host/:host` (endpoint exists) with caching.
- Free subdomain for every store (`slug.yourplatform.lk`).
- Production build for the API (bundle with esbuild or tsup, since `@repo/core` ships as TypeScript source), Docker images, CI, backups, error monitoring.

### Phase 6: Growth modules
- Reviews, blog, abandoned-cart emails, SEO (sitemaps, meta tags per page).
