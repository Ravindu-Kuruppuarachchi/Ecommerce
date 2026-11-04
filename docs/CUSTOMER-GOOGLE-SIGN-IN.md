# Customer accounts and Google sign-in

Customer accounts are shared platform functionality, independent of templates. Every storefront uses the same account page, sign-in, saved delivery address, order history and authenticated checkout. Browsing and cart additions remain public; placing an order requires Google sign-in. This requirement cannot be turned off by a template or optional feature module.

## Configure Google locally

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select or create a project.
2. Configure Google Auth Platform branding, audience and the consent screen. Request only `openid`, `email` and `profile`. If the app is in testing, add the Google accounts that will test sign-in under the test users.
3. Create an OAuth client of type **Web application**. Add the exact authorized redirect URI:

   `http://localhost:3001/api/customer/google/callback`

4. In `apps/storefront/.env.local`, set the following with the values from Google:

   ```dotenv
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_REDIRECT_URI="http://localhost:3001/api/customer/google/callback"
   ```

5. In `apps/api/.env.local`, set `GOOGLE_CLIENT_ID` to the **same** client ID. The API does not need the client secret.
6. For another checkout, apply the migration with the database environment configured, then regenerate the client:

   ```sh
   pnpm exec prisma migrate deploy --schema=packages/database/schema.prisma
   pnpm db:generate
   ```

   The migration has already been applied to the local development database for this change. It adds columns and a session table without deleting customer records or orders. Do not seed an existing store database to enable this feature.

7. Restart the API and storefront through your usual `pnpm dev` process. Open a store and choose **My account**, or go to checkout and choose **Continue with Google**.

For example: `http://localhost:3001/hill-country-coffee/account`.

Until credentials are configured, the Google button is disabled and checkout remains blocked. Merchant and admin logins continue to use the dashboard's existing sign-in flow.

## Production

Use HTTPS. Register the production callback URL with Google and set `GOOGLE_REDIRECT_URI` to that exact URL, on the same origin as the storefront. Configure Google's audience/publishing requirements for your intended customers. Keep secrets in your hosting provider's server environment. The current OAuth configuration supports one storefront origin per deployment; additional custom-domain storefront origins require their own allowed callback configuration before offering Google sign-in there.

## Shared implementation

- `packages/core/src/customer.ts`: delivery-address and profile validation/types.
- `apps/api/src/services/google-identity.ts`: signature, audience, issuer, expiration, verified email and nonce checks.
- `apps/api/src/middleware/customer-auth.ts`: customer session enforcement, separate from merchant authorization.
- `apps/api/src/routes/customer-auth.ts`: Google account linking, profiles, private order history and session revocation.
- `apps/api/src/routes/orders.ts` and `services/orders.ts`: mandatory authentication, store matching and identity-bound orders.
- `apps/storefront/src/lib/customer-server.ts` and `app/api/customer/`: OAuth code exchange and same-origin proxy. Session tokens are stored in HttpOnly, SameSite cookies and only their SHA-256 digests are stored in the database. Production cookies are Secure.
- `apps/storefront/src/lib/customer.tsx`: one customer provider used by the shared store shell.
- `CustomerSignIn`, `CustomerAccount`, `CheckoutForm` and `StoreHeader`: shared UI with each store's theme tokens.

Authorization uses state, a nonce and PKCE. No Google access or refresh tokens are retained. Accounts are identified by Google's stable subject, not by trusting an email from checkout. Verified Google email can link an existing guest customer record in the same store, preserving order history; an account already linked to another Google identity is not silently reassigned. Customers and saved delivery details remain isolated by store. Sessions expire after seven days and sign-out revokes the current session.

See [Google's OpenID Connect guide](https://developers.google.com/identity/openid-connect/openid-connect) and [web-server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server).

## Verification

`pnpm test:features` uses an isolated temporary database and a temporary Google JWKS network fixture with real RSA-signed test tokens. It does not bypass signature verification in the application or use a real Google account. It checks invalid identities, customer/merchant separation, profile persistence and authenticated checkout for every template. A real Google consent and callback round trip must be checked after configuring the OAuth client above.
