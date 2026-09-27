# Ecommerce

A multi-tenant store builder for Sri Lankan merchants. Shop owners sign up, pick a template, customise their storefront, add products and sell on their own domain. The platform handles orders, payments and delivery, and takes 10% of each order.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the architecture and what's planned.

## Structure

| Path | |
| --- | --- |
| `apps/api` | Express + Prisma REST API (port 5000) |
| `apps/dashboard` | Next.js merchant admin (port 3000) |
| `apps/storefront` | Next.js customer storefront (port 3001) |
| `packages/core` | Shared money, feature-module, template and page-section logic |
| `packages/database` | Prisma schema, migrations and seed data |

## Getting started

Requires Node 20+, pnpm 10 and Docker.

```bash
pnpm install

# Environment files
cp apps/api/.env.example apps/api/.env.local            # then set JWT_SECRET
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/storefront/.env.example apps/storefront/.env.local
cp packages/database/.env.example packages/database/.env

# Database
docker compose up -d postgres
pnpm exec prisma migrate dev
pnpm db:seed

# Run everything
pnpm dev
```

The seed creates a demo store:

- Dashboard: http://localhost:3000, log in as `merchant@example.com` / `password123`
- Storefront: http://localhost:3001?store=hill-country-coffee
