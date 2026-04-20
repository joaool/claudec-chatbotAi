import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow chatbot pages to be embedded in iframes from any origin.
        // Per-tenant origin enforcement is handled in app/c/[slug]/page.tsx
        // (Server Component checks Sec-Fetch-Dest + Referer against the
        // client's stored allowedOrigin and returns an error page if unauthorized).
        source: "/c/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
