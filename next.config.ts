import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Skip ESLint during builds completely
    ignoreDuringBuilds: true,
    dirs: [] // Don't run ESLint on any directories
  },
  typescript: {
    // Skip TypeScript checking during builds completely
    ignoreBuildErrors: true,
    tsconfigPath: "tsconfig.json"
  },
  // Disable source maps in production to reduce build time
  productionBrowserSourceMaps: false
};

export default nextConfig;
