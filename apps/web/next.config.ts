import type { NextConfig } from "next";

const apiBaseUrl =
  process.env.API_BASE_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'http://tenis-management-api-internal:3000'
    : 'http://localhost:3000');

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
