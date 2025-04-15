/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['example.com', 'localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
      {
        protocol: 'http',
        hostname: '*',
      },
    ],
  },
  experimental: {
    turbo: {},
  },
  eslint: {
    // Ignore ESLint errors during production build (still shows warnings)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during production build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 