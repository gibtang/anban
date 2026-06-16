import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/api',
        destination: '/#agent-integration',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
