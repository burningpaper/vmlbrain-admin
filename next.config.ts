import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Ensure box-node-sdk (CJS) is included for server bundling in API routes
    serverComponentsExternalPackages: ["box-node-sdk"],
  },
};

export default nextConfig;
