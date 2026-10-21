import type { NextConfig } from "next";

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'http://localhost:3000';

const nextConfig: NextConfig = {
  serverExternalPackages: ['canvas', 'pdfjs-dist'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${GATEWAY_URL}/api/v1/:path*`,
      },
      {
        source: '/api/analytics/:path*',
        destination: `${GATEWAY_URL}/api/v1/analytics/:path*`,
      },
      {
        source: '/api/docs/:path*',
        destination: `${GATEWAY_URL}/api/docs/:path*`,
      },
      {
        source: '/api/openapi.json',
        destination: `${GATEWAY_URL}/api/openapi.json`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/auth/register',
        permanent: true,
      },
      {
        source: '/books/:slug',
        destination: '/book/:slug',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
