import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.25', 'localhost'],
  experimental: {
    // Enable if needed
  },
  headers: async () => [
    {
      source: '/manifest.json',
      headers: [
        { key: 'Content-Type', value: 'application/manifest+json' },
      ],
    },
  ],
};

export default nextConfig;
