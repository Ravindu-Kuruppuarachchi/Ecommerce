/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
