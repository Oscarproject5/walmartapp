import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This skips type checking during the build step
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
