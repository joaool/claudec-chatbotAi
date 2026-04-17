import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes so the full page can be embedded in an iframe
        source: "/:path*",
        headers: [
          // Allow framing from framelink.co (with and without www) and Squarespace
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://framelink.co https://www.framelink.co https://*.squarespace.com https://*.squarespace-config.com",
          },
          // X-Frame-Options is superseded by CSP above in modern browsers,
          // but set SAMEORIGIN as a safe fallback (does not block Squarespace/framelink
          // because CSP takes precedence when both are present in supporting browsers)
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
      {
        // CORS for API routes called from the iframe context
        source: "/c/:path*/api/:rest*",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: "https://www.framelink.co" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,POST,PUT,DELETE" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
