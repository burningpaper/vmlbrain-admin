import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure box-node-sdk (CJS) is included for server bundling in API routes
  serverExternalPackages: ["box-node-sdk"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
