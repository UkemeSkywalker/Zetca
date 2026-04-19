import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.licdn-ei.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.licdn.com',
        pathname: '/**',
      },
    ],
  },
  // Rewrites only needed for local dev (npm run dev).
  // In production (Docker), Caddy routes /api/strategy, /api/copy,
  // /api/scheduler, /api/publisher directly to the backend container.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    return [
      {
        source: '/api/strategy/:path*',
        destination: 'http://localhost:8000/api/strategy/:path*',
      },
      {
        source: '/api/copy/:path*',
        destination: 'http://localhost:8000/api/copy/:path*',
      },
      {
        source: '/api/scheduler/:path*',
        destination: 'http://localhost:8000/api/scheduler/:path*',
      },
      {
        source: '/api/publisher/:path*',
        destination: 'http://localhost:8000/api/publisher/:path*',
      },
    ];
  },
};

export default nextConfig;
