import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In development, proxy /ws to the Express backend so the browser
  // can connect via the same origin without CORS issues.
  // In production set NEXT_PUBLIC_WS_URL to the real backend WS URL.
  async rewrites() {
    return [
      {
        source: "/ws",
        destination:
          process.env.NEXT_PUBLIC_WS_URL
            ? `${process.env.NEXT_PUBLIC_WS_URL}/ws`
            : "http://localhost:8080/ws",
      },
    ];
  },
};

export default nextConfig;
