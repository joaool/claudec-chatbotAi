import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply these headers to all API routes
        source: "/api/:path*",
        headers: [
          { 
            key: "Access-Control-Allow-Origin", 
            value: "https://www.framelink.co/" // Update this!
          },
          { 
            key: "Access-Control-Allow-Methods", 
            value: "GET,OPTIONS,POST" 
          },
          { 
            key: "Access-Control-Allow-Headers", 
            value: "Content-Type, Authorization" 
          },
        ],
      },
    ];
  },
};

export default nextConfig;
