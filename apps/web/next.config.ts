import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Import the shared TypeScript package directly (no separate build step).
  transpilePackages: ["@scenearc/shared"],
  reactStrictMode: true,
  experimental: {
    // Server Actions are used for all mutations.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
