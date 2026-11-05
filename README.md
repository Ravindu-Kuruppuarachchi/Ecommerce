# Ecommerce

A multi-tenant store builder for Sri Lankan merchants. Shop owners sign up, choose a template, edit pages, add products and accept cash-on-delivery orders. Google sign-in is required for customer purchases. Card payments and automatic custom-domain provisioning are planned.

Start with [setup and environment configuration](docs/SETUP.md) and the [code review and security notes](docs/CODE-REVIEW.md).

See [docs/ROADMAP.md](docs/ROADMAP.md) for the architecture and what's planned.

See [store pages and navigation](docs/STORE-PAGES.md) for the shared page builder, and [Google customer sign-in setup](docs/CUSTOMER-GOOGLE-SIGN-IN.md) to enable authenticated purchasing.

## Structure

| Path | |
| --- | --- |
| `apps/api` | Express + Prisma REST API (port 5000) |
| `apps/dashboard` | Next.js merchant admin (port 3002) |
| `apps/storefront` | Next.js customer storefront (port 3001) |
| `packages/core` | Shared money, feature-module, template and page-section logic |
| `packages/database` | Prisma schema, migrations and seed data |

## Getting started

Requires Node 20.9+, pnpm 10 and Docker.

```bash
pnpm install --frozen-lockfile
pnpm env:setup
pnpm env:check
docker compose up -d postgres
pnpm db:generate
pnpm db:deploy
pnpm dev
```

Optional: on a disposable database only, `ALLOW_DESTRUCTIVE_SEED=true pnpm db:seed` erases existing data and creates demo stores:

- Dashboard: http://localhost:3002, log in as `merchant@example.com` / `password123`
- Storefront: http://localhost:3001/hill-country-coffee

## Storefront designs

Twenty editable starter designs are defined in `packages/core/src/templates.ts`:
Classic, Boutique, Bazaar, Studio, Market, Noir, Flora, Atelier, Pulse, Ritual,
Motion, Runway, Avenue, Muse, Circuit, Forge, Reef, Habitat, Paws and Folio.
Filter the gallery by shop type or visual style. See [design notes](docs/STOREFRONT-DESIGNS.md).
The Online store gallery filters them by style and business type and displays
actual storefront renders. Standalone demos are available at
`http://localhost:3001/template-preview/<template-key>` without an API or database.
Demo products and prices are examples; shopping and signup actions are disabled.

In the page editor, Hero banner → Composition selects a full-width image, split
screen, editorial layout or oversized poster. Category tiles also support classic,
editorial and compact arrangements. Existing saved pages remain editable and
continue to render without the new fields. Applying a design preserves page
content unless the merchant explicitly chooses to replace it.

Starter photography and the dashboard font are bundled locally. Merchants can
replace photos in the editor. Template checks run with `npm run test:templates`.

## If development ports are occupied

Run `pnpm dev` once and keep that terminal open. Stop it with Ctrl+C before
starting another copy. The dashboard uses port 3002, the storefront 3001, and
the API 5000. Port 3000 is left available for other local applications.

If you change the dashboard port, also change `DASHBOARD_URL` in
`apps/api/.env.local` and `NEXT_PUBLIC_DASHBOARD_URL` in
`apps/storefront/.env.local`, then restart the servers.

The seed script resets the database to demo data. Run it only when you intend
to replace local data; ordinary restarts only require `pnpm dev`.

See [UI improvements](docs/UI-IMPROVEMENTS.md) for the shared catalog controls, photo gallery, cart accessibility and design-library workflow.

The platform uses [Voxel Labs branding](docs/VOXEL-LABS-BRANDING.md). Open the dashboard root (`http://localhost:3002`) for the public homepage; merchant tools remain at `/dashboard`.
