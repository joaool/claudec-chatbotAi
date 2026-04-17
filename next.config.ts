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
            value: "GET,OPTIONS,POST" 
          },
          // 2. The critical "Unlock" for IFrames
          // We must set X-Frame-Options to an empty string to stop it from blocking the frame
          { 
            key: "X-Frame-Options", 
            value: "" 
          },
           // 3. Updated CSP (Added 'self' and framing permissions)
          { 
            key: "Content-Security-Policy", 
            value: "frame-ancestors 'self' https://framelink.co https://*.squarespace.com https://*.squarespace-config.com;" 
          },
        ],
      },
    ];
  },
};

export default nextConfig;
