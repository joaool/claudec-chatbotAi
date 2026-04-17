import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Change this source to match your chatbot route
        source: "/c/:path*", 
        headers: [
          { 
            key: "Access-Control-Allow-Origin", 
            value: "https://framelink.co" 
          },
          { 
            key: "Access-Control-Allow-Methods", 
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" 
          },
          { 
            key: "Access-Control-Allow-Headers", 
            value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" 
          },
          // --- NEW IFRAME HEADERS ---
          // 1. Content Security Policy (Modern way to allow framing)
          { 
            key: "Content-Security-Policy", 
            value: "frame-ancestors 'self' https://framelink.co https://*.squarespace.com" 
          },
        ],
      },
    ];
  },
};

export default nextConfig;
