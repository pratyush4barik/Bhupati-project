import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
    ],
  },
  experimental: {
    // Prevent Next.js from inferring a parent workspace root
    // because of the payxen-monitor subfolder
  },
};

export default nextConfig;
