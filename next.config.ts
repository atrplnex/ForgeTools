import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/tools",
        permanent: false, // 307 redirect
      },
    ];
  },
};

export default nextConfig;