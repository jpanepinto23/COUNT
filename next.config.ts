import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old Starter Guide PDF (pre-launch points model) was removed; send old email links home.
      { source: '/COUNT-getting-started.pdf', destination: '/', permanent: true },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
};

export default nextConfig;
