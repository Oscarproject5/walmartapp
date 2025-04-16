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
    // This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
    dirs: [] // Skip ESLint for all directories
  },
  typescript: {
    // This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json'
  },
  output: 'standalone',
  swcMinify: true,
  reactStrictMode: false,
  poweredByHeader: false
};

module.exports = nextConfig; 