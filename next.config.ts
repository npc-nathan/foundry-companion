import type { NextConfig } from 'next';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer');

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.0.25', 'localhost'],
  experimental: {
    // Enable if needed
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/relay/download',
      },
    ],
  },
  headers: async () => [
    {
      source: '/manifest.json',
      headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
    },
  ],
};

export default analyzer(nextConfig);
