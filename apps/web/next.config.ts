import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
