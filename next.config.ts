import type { NextConfig } from "next";
const API_URL = process.env.API_URL ?? "http://185.182.9.99:6000";
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
