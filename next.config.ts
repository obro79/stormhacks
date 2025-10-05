import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API routes need server rendering
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
