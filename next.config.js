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
    // Disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript type checking during builds
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  swcMinify: true,
  reactStrictMode: false,
  poweredByHeader: false
};

module.exports = nextConfig; 