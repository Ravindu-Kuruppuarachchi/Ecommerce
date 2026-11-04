# Code review, architecture and security notes

Reviewed: 4 November 2026. This is a repository review and automated regression pass, not a guarantee that all defects or vulnerabilities have been eliminated. Existing uncommitted feature work was preserved. No merchant data was reset and no deployment was performed.

## Code organization

| Area | Responsibility |
| --- | --- |
| `apps/api/src/routes` | HTTP validation, authentication/module guards, tenant-scoped requests |
| `apps/api/src/services` | Transactions, pricing, stock, orders, variants, template setup and Google identity verification |
| `apps/api/src/middleware` | Merchant/customer authentication, platform roles and rate limits |
| `apps/api/src/lib` | Validated environment, Prisma, HTTP errors, image storage, shared money input validation |
| `apps/dashboard/src/components/editor` | Shared section editor, page presets, page destinations and navigation controls |
| `apps/dashboard/src/lib` | One API client and shared public URL configuration |
| `apps/storefront/src/components` | Shared shopping, account, cart, checkout, header/footer and section rendering for every design |
| `apps/storefront/src/app/api/customer` | Same-origin customer cookie proxy and Google OAuth endpoints |
| `packages/core/src` | Money, modules, templates, section schemas, page navigation, safe URLs and customer schemas |
| `packages/database` | Schema, additive migrations, explicitly destructive demo seed |
| `scripts` | Environment setup/checks, source-integrity checks, isolated feature verification and existing page preparation |

The existing app/service/core boundaries were retained. Repeated money validators now use `apps/api/src/lib/validation.ts`; dashboard API URLs use `lib/config.ts`; section links share safe URL and page-resolution helpers. Templates remain data rather than separate implementations of checkout/authentication.

## Findings fixed in this review

| Finding | Change |
| --- | --- |
| Known vulnerable dependencies | Updated Next.js to 15.5.28, Turbo to 2.11.10 (including task/environment configuration), and patched Axios/Zod and vulnerable transitive dependencies; committed reproducible lockfile. Zod schemas use the compatibility `zod/v3` entry point of the patched package. |
| Existing tokens remained valid after password changes | Merchant JWTs carry a keyed credential fingerprint checked against the current account on every request. Deleted accounts and old-password tokens are rejected. The current browser receives a replacement token. Older token formats require a fresh login. |
| Registration accepted passwords bcrypt silently truncates | Shared registration/password-change validation enforces bcrypt's 72-byte limit, including Unicode. |
| Forwarded IP trusted on direct connections | Explicit `TRUST_PROXY_HOPS`, default zero, with integer validation. |
| Private API responses potentially cached | API responses use `Cache-Control: no-store`. Customer proxy responses already suppress caching. |
| Concurrent cancellation could restore stock twice | Order rows are locked before reading/changing payment and status; stock restoration no longer swallows errors. |
| Concurrent balance transfers could over-credit/debit | Per-store row lock serializes balance checks and ledger writes, including collected payment fees. |
| Absolute stock counts could use stale values | Inventory adjustment and variant edits lock stock rows before calculating deltas; product edits use the locked/current product quantity. |
| Ambiguous shipping zones under simultaneous writes | Per-store transaction lock protects overlap checks and writes. |
| Variant references insufficiently checked | Variant stock writes include store scope; sync rejects foreign and duplicate variant IDs. |
| Monetary overflow and invalid product query limits | Shared bounded minor-unit parsing, total bounds at checkout, integer catalog limits with validation errors. |
| Malformed cookie-proxy JSON looked like a backend outage | Invalid JSON/non-object bodies return 400 without contacting the API. |
| Ambiguous URL forms and stale page destinations | Content URL validation rejects control characters, backslashes, protocol-relative URLs and embedded credentials; deleted/unpublished custom-page links fall back to Products. |
| Legacy store query links lost filters / could double-prefix paths | Validated canonical redirect retains query parameters and handles already-prefixed paths. |
| Login redirect accepted ambiguous paths | Same-site safe-path validation. Demo credentials are no longer prefilled or displayed. |
| Settings displayed a localhost-only URL | Shared configured storefront URL, clickable and able to wrap on mobile. |
| Malformed saved cart could break the UI or exceed checkout limits | Validate persisted cart fields, quantities and item limits; clamp additions to API quantity bounds. |
| Section validation kept unknown nested properties | Recursively strip unknown button/tile fields; stop list validation at the size limit. |
| Fragile production startup | Correct Next.js start ports; API start supports shared TS imports; dynamic route inputs await Next.js 15 params/searchParams. |
| Configuration and demo-data hazards | Broad secret ignores, environment templates, non-overwriting setup, environment validation, loopback database ports, explicit destructive-seed opt-in. |

The local placeholder JWT secret was replaced with a random value. Existing application environment files were preserved otherwise, with missing local public URL/proxy settings added. A root Compose `.env` was created using existing local database credentials. Secrets were not printed or committed.

## Security boundaries checked

- Merchant queries use the store resolved from the authenticated owner. Customer sessions are store-scoped; a merchant JWT cannot buy as a customer and a customer token cannot access merchant/platform routes.
- Platform permissions are read from the database and mutations write audit records.
- Checkout derives identity, prices, tax, shipping, discounts and stock from the server. Client prices and email do not establish order identity.
- Customer sessions use random opaque tokens, store only digests in PostgreSQL, and stay in HttpOnly cookies through the storefront proxy. Mutations check Origin.
- Google identity verification checks signature, issuer, audience, expiry, nonce and verified email. OAuth uses state and PKCE. Actual Google consent is still pending credentials.
- SQL uses Prisma parameter binding. Test-only database CREATE/DROP identifiers are generated and pattern-checked.
- Uploads require merchant authentication, limit size and accept raster signatures only. Filenames are random and SVG uploads are rejected. Disk storage is single-instance infrastructure, not object storage.
- Draft page sections remain separate from published content. Header/footer navigation comes from actual published pages. Core Home/Products can be hidden; other pages can be deleted.

## Validation evidence

- 62 integration checks passed against a disposable PostgreSQL database, including all 20 templates and all shop categories. Database removal confirmed.
- 16 shared template/domain tests passed, covering navigation, section schemas, URL handling and money bounds.
- Type checks and production builds were run for the API, dashboard and storefront after the dependency update.
- Full dependency audit, including development tooling, reported **zero known vulnerabilities** after installation. This result is time-specific; keep running the audit and review future advisories.
- Repository integrity checks passed for static page routes, local Markdown links and environment-file exclusions.
- Fresh environment setup test passed: matching random database credentials, a random signing secret, owner-only file permissions, non-overwriting reruns and detection of public secret variables without leaking their values.
- Turbo dev/start dry runs resolved all three application commands and the compiled API passed a production-mode health check on a temporary port.
- 40 production-browser template checks passed (20 designs at 1440px and 375px), plus login/settings layout, rejected unsafe redirect, password-token replacement, canonical redirects and response headers. Account browser checks used fixtures; no real merchant password was changed.

Official dependency guidance: [Next.js October security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026). Package-registry audit results, rather than vulnerability count alone, drove the lockfile updates.

## Remaining limitations and deployment work

These are explicit limits, not claims of completed features:

1. Google credentials are absent. Real consent/callback testing and customer purchase testing with your Google client are required before launch.
2. Merchant sessions still use browser localStorage bearer tokens. Password changes revoke old sessions, but logout only removes the local copy. A future merchant HttpOnly-cookie/session architecture would reduce token exposure if a browser script were compromised; platform MFA and password recovery are not implemented.
3. Rate limiting is in memory and uploads are on local disk. Multi-instance deployments need shared rate-limit storage and object storage, plus edge request limits, TLS, backups and monitoring. Image signature checks do not constitute image decoding or malware scanning.
4. COD is implemented. Card gateway callbacks, refunds, courier booking, notifications, reviews/blog and automatic custom-domain DNS/TLS remain unavailable. Checkout does not yet have a client retry/idempotency key; a deliberate repeated purchase can create a second order.
5. Public catalog responses are capped at 100 products and merchant/customer lists also have caps; full large-catalog pagination needs a separate implementation. Product pages include related-product links; dynamic runtime content cannot be fully proven by static route checks.
6. Draft **stores** remain publicly viewable for preview, although checkout is blocked. Unpublished **page drafts** remain private. Change this store-level behavior if launch requirements demand private pre-launch stores.
7. Existing demo accounts/data were not changed or removed. Do not deploy a database containing the known seed accounts. Changing the generated Compose password does not rotate an existing PostgreSQL volume's password.
8. No real payment transaction, external penetration test, production proxy/DNS deployment or full accessibility audit was performed.

## Maintaining the project

Use [SETUP.md](SETUP.md) for commands and environment ownership. Add shared behavior to core/services/components before introducing template-specific branches. New section types start in the core schema and must render through the common storefront renderer. New merchant routes must enforce tenant ownership; platform writes must be audited. Keep money in integer minor units and inventory mutations through `changeStock`.

Run the integrity check, type checks, shared tests and appropriate integration checks for changes; run production builds and the dependency audit before release. Keep deployment secrets outside Git. If a secret is ever committed, revoke/rotate it; an ignore rule cannot undo disclosure.
