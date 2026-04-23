import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WebContainer requires cross-origin isolation (COOP + COEP) to use SharedArrayBuffer.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
