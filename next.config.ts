import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    
    return [
      {
        source: '/api/strategy/:path*',
        destination: `${pythonServiceUrl}/api/strategy/:path*`,
      },
      {
        source: '/api/copy/:path*',
        destination: `${pythonServiceUrl}/api/copy/:path*`,
      },
      {
        source: '/api/scheduler/:path*',
        destination: `${pythonServiceUrl}/api/scheduler/:path*`,
      },
    ];
  },
};

export default nextConfig;
