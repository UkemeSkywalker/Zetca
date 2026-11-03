import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // The style library moved onto the Designer page ("Start from a style")
  async redirects() {
    return [
      { source: '/dashboard/designer/styles', destination: '/dashboard/designer', permanent: true },
      { source: '/dashboard/designer/styles/:styleId', destination: '/dashboard/designer', permanent: true },
    ];
  },
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
};

export default nextConfig;
