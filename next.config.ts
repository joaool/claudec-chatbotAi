import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*", // Matches API routes
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // Replace with your actual domain
          { key: "Access-Control-Allow-Origin", value: "https://dove-terrier-7kbs.squarespace.com" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
