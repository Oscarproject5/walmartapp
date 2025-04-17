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
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    turbo: {},
  },
  // Required for Vercel deployment when handling specific routes or configurations
  poweredByHeader: false,
  // Add any additional environment variables needed for deployment
  env: {
    // You can add environment-specific variables here if needed
  },
};

module.exports = nextConfig; 