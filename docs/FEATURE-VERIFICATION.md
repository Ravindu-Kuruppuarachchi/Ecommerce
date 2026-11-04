# Feature verification — 4 November 2026

All 20 templates across all 11 shop categories passed the checked local flows. This verifies the implemented features below; it does not mean the unfinished integrations are available.

## Results

| Check | Result |
| --- | --- |
| API/database integration groups | 57 passed, 0 failed |
| Shared-code regression tests | 13 passed |
| Template browser checks | 20 templates × desktop (1440px) and mobile (375px): 40 passed |
| Dashboard browser checks | 13 screens × desktop and mobile: 26 passed |
| Shopping UI | Product detail, cart addition/quantity/persistence, search and checkout form passed |
| Editor UI | Home, Products and Story selection/preview passed |
| Password Settings UI | Desktop/mobile rendering, mismatch validation, incorrect-current-password feedback and pending/cleared form states passed; success response intercepted to preserve the existing account password |
| Product form UI | Desktop/mobile checks for no-option payloads, generating two variants, and removing the final option; submissions intercepted to preserve merchant inventory |
| Customer accounts UI | Guest checkout block, profile editing, saved-address prefilling, order history, purchase receipt, and expired-session cart preservation checked at desktop/mobile sizes with browser response fixtures |
| Navigation UI | All 20 template previews × desktop/mobile: 40 checks for real page destinations and clickable Story navigation |
| Page-builder workflow | Temporary QA store: create/publish contact and category pages, show/hide/reorder menu items, remove/add/link hero and featured-collection buttons and category tiles, delete pages; immediate menu-preview refresh, published button navigation and category-only products checked at desktop/mobile sizes |
| Type checks | Core, API, dashboard and storefront passed |
| Test data cleanup | Temporary API stopped; disposable database and upload directory removed |

## Shop categories

For each template, the integration suite applied its theme/pages, saved and published page sections, checked catalog inventory, placed a cash-on-delivery order, and cancelled it to restore stock. Browser checks covered rendering, images, horizontal overflow, readable product rails, mobile menus, and campaign controls where present.

| Shop category | Templates | Result |
| --- | --- | --- |
| Electronics | Circuit, Bazaar, Pulse | Passed |
| Hardware | Forge | Passed |
| Aquariums | Reef | Passed |
| Furniture & home | Habitat, Studio, Atelier | Passed |
| Pets | Paws | Passed |
| Books | Folio | Passed |
| Fashion | Motion, Runway, Muse, Boutique, Noir | Passed |
| General | Avenue, Classic | Passed |
| Food & grocery | Market | Passed |
| Garden & plants | Flora | Passed |
| Beauty | Ritual | Passed |

## Shared features checked

| Feature | Verified behavior |
| --- | --- |
| Accounts and access | Registration/login, merchant/admin separation, tenant-scoped products/pages, unavailable-module guards and optional-module switching |
| Password updates | Current-password verification, confirmation/length validation, hashed storage, signed-in account isolation, old-password rejection and successful sign-in with the new password; tested against the disposable database |
| Google customer accounts | RSA signature, issuer, audience, expiry, nonce and verified-email validation; linked legacy profiles; saved delivery details; revoked/expired sessions; customer/merchant separation; private order history; cookie-proxy origin and store checks |
| Products | Creation/editing/deletion, prices in cents, search, category filtering, variant prices and hidden drafts |
| Inventory | Stock adjustments/history, low-stock data, rejection of negative stock and concurrent last-unit overselling |
| Page builder | Template application with preservation/replacement, validated sections, saving drafts, publishing, page connections, protected Products page |
| Pages and navigation | Real department pages in every template, page presets, draft visibility, automatic menus, ordering/hiding, category scoping and deletion respected by later preparation |
| Shipping | Zone creation/editing/deletion, district coverage, overlapping-zone rejection, fees and free-delivery threshold |
| Discounts | Creation/editing/deletion, percent/fixed/automatic/free-delivery discounts, inactive/minimum-spend checks, concurrent usage limits and cancellation releasing usage |
| Checkout | Server-side repricing, tax, discount, delivery, COD order creation, variant selection, stock reservation/cancellation and closed-store rejection |
| Payments/bookkeeping | COD cash confirmation, platform fee ledger, duplicate confirmation rejection and balance reporting |
| Customers/newsletter | Order history, paid spend, newsletter deduplication |
| Analytics | Recorded funnel events, visitors and sales reports |
| Images | Supported upload/public retrieval and unsupported-format rejection |
| Platform admin | Reporting, suspension/reactivation, fee collection and audit logs |

## Problems fixed

1. Feature-module lookup accepted inherited object names such as `constructor` as module keys. It now accepts only defined module keys.
2. Page-section lookup had the same issue and could throw a server error for malformed sections. Invalid section types now produce validation errors without changing page content.
3. Settings allowed a tax rate up to 100%, while the API supports up to 50%. The input now matches the API limit.
4. The API test command referenced Jest without a configured suite. `npm test` now runs the real shared-code and isolated integration suites.
5. A product without options generated an invisible empty variant, causing saves to fail with “Add options before adding variants.” Empty options now generate no variants, and the form sends an empty variant list for simple products, including after removing the final option.

## Not implemented or not verified as a live integration

| Area | Current state |
| --- | --- |
| Card payments / PayHere | Not implemented; checkout currently supports COD only |
| Refunds | Not implemented; paid orders correctly reject simple cancellation |
| Courier integration | Manual zones, fees and tracking fields exist; automated booking/tracking/remittances are pending |
| Custom domains | Host lookup exists; DNS verification, automated TLS and production domain provisioning are pending |
| Reviews and blog | Marked unavailable and cannot be enabled |
| Order emails/SMS | Notification integration is pending |
| Live payouts/payment-provider callbacks | No real bank transfer or external payment-provider transaction was performed |
| Production hosting/load | Development audit only; no production deployment, migration rehearsal or load test was performed |
| Google consent round trip | Requires OAuth credentials; not yet performed against a real Google account. Local verification uses RSA-signed fixtures with the normal token verifier. See [setup](CUSTOMER-GOOGLE-SIGN-IN.md). |

Template previews deliberately disable shopping. Their sample products and category names do not create merchant inventory; store owners must link collections to their actual categories.

## Re-run

- `npm test`: shared-code tests plus the API integration audit. Requires the local PostgreSQL connection in `apps/api/.env.local` and permission to create a disposable database. It creates a unique `ecommerce_feature_qa_*` database and removes it afterward.
- `npm run test:features`: integration suite only. A JSON result is written to `/tmp/ecommerce-feature-results.json`; `FEATURE_REPORT_PATH` can select another output path.
- `pnpm run type-check`: package type checks.

The integration audit uses its own API process, database, accounts, orders and uploaded files. Existing merchant products, orders and balances are not used for those mutations. Browser shopping checks stop before placing an order in the existing store.


## Repository review — 4 November 2026

The final review passed 62 isolated integration checks, 16 shared template/domain tests and the fresh environment-setup test. All 20 templates passed production browser navigation/layout checks at 375px and 1440px (40 combinations). Login/settings checks verified blank credentials, safe redirects, configured storefront links and password-session rotation using browser fixtures. Canonical redirects and security headers passed. The compiled API health check passed in production mode.

Both Next.js production builds, the API build, type checks, repository integrity checks and environment checks passed. The full dependency audit (including development tools) reported zero known vulnerabilities at review time. See [CODE-REVIEW.md](CODE-REVIEW.md) for fixes and limitations and [SETUP.md](SETUP.md) for setup. Real Google consent remains untested until credentials are supplied.
