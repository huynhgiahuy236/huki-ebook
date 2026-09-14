import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/auth/:path*',
        destination: 'http://localhost:3001/api/v1/auth/:path*',
      },
      {
        source: '/api/v1/users/:path*',
        destination: 'http://localhost:3001/api/v1/users/:path*',
      },
      {
        source: '/api/v1/sessions/:path*',
        destination: 'http://localhost:3001/api/v1/sessions/:path*',
      },
      {
        source: '/api/v1/businesses/:path*',
        destination: 'http://localhost:3002/api/v1/businesses/:path*',
      },
      {
        source: '/api/v1/stores/:path*',
        destination: 'http://localhost:3002/api/v1/stores/:path*',
      },
      {
        source: '/api/v1/members/:path*',
        destination: 'http://localhost:3002/api/v1/members/:path*',
      },
      {
        source: '/api/v1/books/:path*',
        destination: 'http://localhost:3003/api/v1/books/:path*',
      },
      {
        source: '/api/v1/categories/:path*',
        destination: 'http://localhost:3003/api/v1/categories/:path*',
      },
      {
        source: '/api/v1/authors/:path*',
        destination: 'http://localhost:3003/api/v1/authors/:path*',
      },
      {
        source: '/api/v1/publishers/:path*',
        destination: 'http://localhost:3003/api/v1/publishers/:path*',
      },
      {
        source: '/api/v1/seller/:path*',
        destination: 'http://localhost:3003/api/v1/seller/:path*',
      },
      {
        source: '/api/v1/orders/:path*',
        destination: 'http://localhost:3003/api/v1/orders/:path*',
      },
      {
        source: '/api/v1/cart/:path*',
        destination: 'http://localhost:3003/api/v1/cart/:path*',
      },
      {
        source: '/api/v1/payments/:path*',
        destination: 'http://localhost:3003/api/v1/payments/:path*',
      },
      {
        source: '/api/v1/shipping/:path*',
        destination: 'http://localhost:3004/api/v1/shipping/:path*',
      },
      {
        source: '/api/v1/shipments/:path*',
        destination: 'http://localhost:3004/api/v1/shipments/:path*',
      },
      {
        source: '/api/v1/forum/:path*',
        destination: 'http://localhost:3005/api/v1/forum/:path*',
      },
      {
        source: '/api/v1/reviews/:path*',
        destination: 'http://localhost:3005/api/v1/reviews/:path*',
      },
      {
        source: '/api/v1/chat/:path*',
        destination: 'http://localhost:3005/api/v1/chat/:path*',
      },
      {
        source: '/api/v1/notifications/:path*',
        destination: 'http://localhost:3005/api/v1/notifications/:path*',
      },
      {
        source: '/api/v1/moderation/:path*',
        destination: 'http://localhost:3005/api/v1/moderation/:path*',
      },
      {
        source: '/api/v1/vouchers/:path*',
        destination: 'http://localhost:3007/api/v1/vouchers/:path*',
      },
      {
        source: '/api/v1/banners/:path*',
        destination: 'http://localhost:3007/api/v1/banners/:path*',
      },
      {
        source: '/api/v1/flash-sales/:path*',
        destination: 'http://localhost:3007/api/v1/flash-sales/:path*',
      },
    ];
  },
};

export default nextConfig;

