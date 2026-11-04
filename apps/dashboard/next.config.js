/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A separate build directory lets CI verify production while local dev runs.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  experimental: { cpus: 2 },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
  // Transpile shared workspace packages if needed
  transpilePackages: ["@repo/core"],
  // Allow external images (Unsplash, etc.)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
