import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure box-node-sdk (CJS) is included for server bundling in API routes
  serverExternalPackages: ["box-node-sdk"],
};

export default nextConfig;
