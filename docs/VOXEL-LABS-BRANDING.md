# Voxel Labs platform identity

Updated 4 November 2026.

## Reference and scope

The platform is a Voxel Labs product. The reference is [Voxel Labs](https://voxel-lab.vercel.app/), with the original wordmark supplied by the team. The company site's pale neutral surfaces, near-black typography, orange actions and geometric structure inform the commerce platform. The product copy describes the store builder's actual features, rather than the company's robotics and AI services.

The public landing page, merchant account screens, merchant shell and platform-admin shell now share that identity. Merchant storefronts continue to use their own themes and logos. In the merchant dashboard, the store name leads both the sidebar and mobile header; a smaller “Powered by Voxel Labs” link sits beneath it. The same identity component is reused in the mobile navigation drawer.

## Entry points

- Dashboard app `/`: public product homepage with features, designs, pricing, sign-in and registration links.
- Dashboard app `/login`, `/register`: existing account flows with shared Voxel Labs branding.
- Dashboard app `/dashboard`: existing merchant home; its authentication protection is unchanged.
- Storefront app `/`: redirects to `NEXT_PUBLIC_DASHBOARD_URL`, which defaults to `http://localhost:3002` for local development. Set that existing variable to the dashboard's public origin when hosting.
- Storefront tenant routes and template-preview routes remain available at their existing addresses.

`NEXT_PUBLIC_STOREFRONT_URL` in the dashboard determines the destinations of live design previews and the store-address prefix during registration. Configure it for the hosted storefront origin.

## Shared components and assets

- `apps/dashboard/src/components/VoxelBrand.tsx`: the supplied wordmark, used without recolouring or redrawing it. Keep the dark wordmark on a light surface, including the backplate in the platform-admin sidebar.
- `apps/dashboard/src/components/AccountLayout.tsx`: shared account-page framing, company links and introductory content.
- `apps/dashboard/src/app/voxel.css`: public-site and account-page layout. Light appearance is intentional; it keeps the supplied dark wordmark legible. Controls use 8px radii and preview frames use 12px radii. Design variance 5/10, motion intensity 2/10, visual density 4/10.
- `apps/dashboard/tailwind.config.js`: shared orange brand scale. Darker shades support readable text links and white text in existing dashboard controls. Bright orange public/account actions use dark text.
- `apps/dashboard/public/brand/voxel-labs-logo.png`: original supplied logo.
- `apps/dashboard/src/app/icon.png`: the matching icon from the company site’s `/logo-icon.png`, used as the browser icon.
- `apps/dashboard/public/brand/previews`: screenshots of the app's actual Habitat, Runway, Reef and Circuit templates. Images use Next.js optimisation, explicit dimensions and responsive sizes. Refresh these captures if their source templates change; their adjacent links always open the live designs.

No external font or image service is required by the homepage. The existing self-hosted sans-serif font remains in use. Reduced-motion preferences disable movement and smooth scrolling.

## Validation

The homepage, login and registration were checked at 375px and 1440px, including image loading, horizontal overflow, section navigation, sign-in/register links and store-address generation. Account creation was not submitted during these checks, so no test merchants or orders were created.

TypeScript checks, source integrity and production builds passed. The branded merchant shell and storefront-root redirect also passed browser checks. A local Lighthouse production audit measured 95 performance, 100 accessibility, 100 best practices and 100 SEO; these are local measurements, not a guarantee for hosted traffic.
