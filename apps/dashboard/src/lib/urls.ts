export const STOREFRONT_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001").replace(/\/$/, "");

export const storefrontUrl = (slug: string, path = "") => `${STOREFRONT_URL}/${slug}${path}`;
