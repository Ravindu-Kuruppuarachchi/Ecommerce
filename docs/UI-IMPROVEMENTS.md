# Storefront and design-library improvements

Updated 4 November 2026.

## Design direction

Modern retail layouts with clear product information, generous spacing and useful controls. Existing template colours, typography, photography, pages and navigation remain the source of each store's identity. Design variance: 5/10; motion: 2/10; density: 4/10. These changes evolve the shared components rather than creating a separate implementation per industry.

## What changed

- **Catalogs:** larger headings, category tabs, collection search, price/name sorting, stock and sale filters, live result counts, and helpful empty states. Category-specific pages retain their category restriction. Merchants can turn the tools off in the product-catalog section editor using “Show search, sorting and stock filters”. Older saved sections enable them by default.
- **Product cards:** consistent variant-aware prices and availability, sold-out labels, keyboard focus styling, and a second product photograph on pointer hover when available. This is a product-card feature; hero layouts do not gain secondary images. Motion respects reduced-motion preferences.
- **Product details:** selectable photo thumbnails, previous/next controls, arrow-key navigation, photo count and an unavailable-image fallback. The purchase panel stays visible alongside photographs on desktop.
- **Search:** explicit loading, no-results and failure states, retry action, category labels and larger result images. Previous requests are cancelled when the query changes.
- **Cart:** keyboard focus stays inside the open drawer; Escape closes it and restores focus. Quantity controls respect stock and the existing 100-item limit. Checkout explains the Google sign-in requirement.
- **Online store dashboard:** the applied template appears above separate “Design library” and “Colours & style” tabs. Library cards show their starter-page count, and empty searches offer a reset. Switching tabs preserves unsaved appearance edits. The obsolete manual header-link editor is removed; navigation is managed with store pages.

## Shared implementation

`packages/core/src/catalog.ts` owns filtering, sorting and product-summary calculations. `ProductCatalog`, `ProductCard`, `ProductGallery`, `StoreHeader` and `CartDrawer` in `apps/storefront/src/components` serve every template. The catalog editor setting lives in `packages/core/src/sections.ts`; no database migration is required.

Catalog filters currently operate on the products returned by the existing catalog endpoint (up to 100). Server-side pagination and full-catalog sorting remain future work for larger inventories. Template previews allow catalog filtering but intentionally do not place orders. Actual checkout still requires the Google configuration documented in [Customer Google sign-in](CUSTOMER-GOOGLE-SIGN-IN.md).

## Validation

- Shared template/catalog tests cover all starter-page schemas plus variant stock, minimum prices, sale filtering, category/search matching, sorting and preservation of input order.
- Browser checks use an isolated, read-only fixture store with simple products, variants, sale items and sold-out products. No merchant products or orders are changed.
- All 20 template catalogs passed 375px and 1440px overflow checks and search/reset interactions. Fixture browser checks passed catalog sorting/filtering, gallery selection and keyboard wrapping, cart focus trapping/restoration, search failure/retry, and dashboard tabs/unsaved edits/filter reset.
- All 17 shared tests, TypeScript checks, source-integrity checks and production builds passed.

See [Store pages](STORE-PAGES.md) for navigation/editing and [Storefront designs](STOREFRONT-DESIGNS.md) for template architecture.
