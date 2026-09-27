# ecommerce-saas

Multi-tenant store builder for Sri Lankan merchants. The platform takes 10% of each order's goods subtotal. See `docs/ROADMAP.md` for the plan and architecture decisions.

## Commands
- pnpm isn't on PATH here; use `npx pnpm@10 <cmd>` (the repo pins `packageManager: pnpm@10.34.5`).
- DB: `docker compose up -d postgres`, then `node_modules/.bin/prisma migrate dev`, then `npx pnpm@10 db:seed` (login: merchant@example.com / password123).
- Regenerate the Prisma client with `npx pnpm@10 db:generate` (runs from packages/database; running prisma from the repo root fails because pnpm isn't on PATH).
- Run: API `cd apps/api && ../../node_modules/.bin/tsx src/index.ts` (port 5000). Storefront `next dev -p 3001`. Dashboard `next dev -p 3000`; port 3000 is often taken by another local container, so use 3002, and start the API with `DASHBOARD_URL=http://localhost:3002` and the storefront with `NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3002` (the editor preview only accepts messages from that origin).
- Type-check each package: `../../node_modules/.bin/tsc --noEmit -p .` from its folder.

## Rules
- Money: integer cents in `*Cents` fields, rates in basis points (`*Bps`). Only use the helpers in `@repo/core/money.ts`. Never compute money with floats.
- Every merchant query is scoped by `req.store.id` (from `requireStore`). Never trust a store id or price sent by the client.
- Money owed moves only through `LedgerEntry` rows with a unique `key`. Don't edit balances any other way.
- Page content is sections validated by `validateSections`. New section types go in `packages/core/src/sections.ts` first.
- Storefront sections render on the server and inside the editor preview, so section components can't use hooks or server-only code. Colours come from `store-*` Tailwind tokens (CSS variables), and Tailwind opacity modifiers like `bg-store-bg/90` don't work on them.
- New optional features are modules in `packages/core/src/modules.ts`; guard their routes with `requireModule`.

## UI workflow
- Design direction comes from the `design-taste-frontend` skill (installed in `../.claude/skills`).
- After any UI change, use playwright-cli (run it from `~/Documents/ecommerce`, where its config lives) to check the page at 375px and 1440px before calling it done.
