# Setup and environment configuration

Last reviewed: 4 November 2026.

## Local installation

Use Node.js 20.9 or later, pnpm 10 (the repository pins 10.34.5), and Docker Compose. If pnpm is missing, enable Corepack with `corepack enable`, or invoke commands through `npx pnpm@10.34.5`.

Run from the `ecommerce-saas` directory:

```sh
pnpm install --frozen-lockfile
pnpm env:setup
pnpm env:check
docker compose up -d postgres
pnpm db:generate
pnpm db:deploy
pnpm dev
```

`env:setup` creates **missing files only**, uses random credentials for a fresh installation, and writes new files with owner-only permissions. It never resets the database, replaces existing environment files, or prints secrets. When an existing local database URL is present, it reuses those credentials for Compose. `env:check` checks consistency and reports variable names, not values.

The dashboard is at `http://localhost:3002`, storefronts at `http://localhost:3001/<store-slug>`, and API at `http://localhost:5000`. Create a merchant using the dashboard registration page. Run only one development stack at a time.

For an existing database, **do not change its password in a file and expect Docker to rotate it**: PostgreSQL initialization variables only apply to an empty volume. Update the actual database role deliberately and then update both database URLs. Back up data before database maintenance.

### Optional disposable demo data

The seed deletes existing stores, users, orders, and other data. It is blocked unless explicitly enabled and is always blocked when `NODE_ENV=production`.

```sh
# ONLY for a disposable local database that you intend to erase:
ALLOW_DESTRUCTIVE_SEED=true pnpm db:seed
```

The demo merchant and administrator use the credentials described in the seed/README. Never seed a production database. Restarting the application does not require seeding.

## Files and variables

| File | Purpose and variables |
| --- | --- |
| `.env` | Docker Compose: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`; optional `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD` |
| `apps/api/.env.local` | `DATABASE_URL`, random `JWT_SECRET`, `PORT`, `NODE_ENV`, `DASHBOARD_URL`, `STOREFRONT_URL`, `PUBLIC_API_URL`, `UPLOAD_DIR`, `TRUST_PROXY_HOPS`, `GOOGLE_CLIENT_ID` |
| `apps/dashboard/.env.local` | `NEXT_PUBLIC_API_URL` (including `/api`), `NEXT_PUBLIC_STOREFRONT_URL` |
| `apps/storefront/.env.local` | `NEXT_PUBLIC_API_URL`, optional internal `API_URL` (including `/api`), `NEXT_PUBLIC_DASHBOARD_URL`, server-only `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| `packages/database/.env` | `DATABASE_URL` used by Prisma migration/generation tooling |

Each location has a committed `.env.example`. `.gitignore` excludes `.env` and **all** `.env.*` variants except example files, plus private keys, database dumps, uploads, test artifacts and build output. Existing files already committed to Git are not made private by adding an ignore rule; the source-integrity check rejects tracked non-example environment files.

- Values beginning with `NEXT_PUBLIC_` are embedded in browser code. They must never contain database passwords, signing keys, OAuth client secrets, or private tokens. Rebuild Next.js apps after changing public values.
- The API loads `.env.local` before `.env`; existing process environment variables take precedence. Next.js uses its normal environment-file loading. Prisma uses the database package's `.env`; keep it aligned with the API URL.
- `JWT_SECRET` should be at least 32 random characters; `openssl rand -hex 32` generates a suitable value. Rotation invalidates merchant sessions. Password changes also invalidate older sessions while returning a replacement token to the current browser.
- `TRUST_PROXY_HOPS=0` is correct for direct local access. Use `1` only when all API traffic passes through exactly one trusted proxy and direct access is blocked. Incorrect trust settings let callers spoof rate-limit IPs.
- Production API public origins must use HTTPS, with no path. Internal `API_URL` may use HTTP on a private network. Browser API URLs include `/api`.
- Compose binds PostgreSQL and optional pgAdmin to loopback only. Hosted production should use a separately secured database, backups and restricted network access.

## Google sign-in

Follow [CUSTOMER-GOOGLE-SIGN-IN.md](CUSTOMER-GOOGLE-SIGN-IN.md). The API and storefront client IDs must match. The client secret belongs only in the storefront server environment. The local callback is `http://localhost:3001/api/customer/google/callback`.

Google credentials are still not configured in this workspace. This is reported by `env:check`; shoppers cannot purchase until Google sign-in is configured. Do not work around that by enabling anonymous checkout. Real Google consent must be tested with your client before release.

## Production build and start

Set production URLs and secrets through your hosting provider's environment/secret settings (or protected server-side files). Do not copy local demo credentials to the server. Build with the final public URLs:

```sh
pnpm install --frozen-lockfile
pnpm db:generate
NODE_ENV=production pnpm env:check
pnpm db:deploy
pnpm build
NODE_ENV=production pnpm start
```

Dashboard and storefront start on 3002 and 3001 respectively; API uses `PORT` (5000 by default). Terminate TLS at your reverse proxy and forward traffic to these services. The API production command uses `tsx` for the shared TypeScript workspace package; do not omit its runtime dependency when packaging the application.

`NEXT_BUILD_DIR=.next-review` allows an isolated verification build without overwriting an active development `.next` directory. Set the same variable when starting that build. This is optional; normal build/start commands use `.next`.

Before multi-instance hosting, move uploaded images to object storage and rate-limit counters to Redis or an equivalent shared service. Set up database backups and recovery tests. Custom-domain DNS/TLS provisioning, payments beyond COD, refunds and notifications are not implemented; see [CODE-REVIEW.md](CODE-REVIEW.md).

## Verification

```sh
pnpm env:check
pnpm lint
pnpm type-check
pnpm test:templates
pnpm test:setup
pnpm test:features
pnpm audit:dependencies
pnpm build
```

`lint` runs repository integrity checks for static routes, local Markdown links, public secret-like variable names and tracked environment files; it is not an ESLint style pass. TypeScript performs the type checks.

`test:features` needs a local PostgreSQL role allowed to create and drop a test database. It creates a unique disposable database and separate API process, then removes them. It does not seed or modify the configured merchant database. Its Google signing fixtures apply only to that disposable process.
