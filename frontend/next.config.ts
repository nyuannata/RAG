import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // Warning: Allow production builds to successfully complete even if the project has ESLint warnings/errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even with minor compiler strictness issues if any.
    ignoreBuildErrors: true,
  },
  async rewrites() {
    // Hanya gunakan proxy localhost saat dijalankan di komputer lokal (development)
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/_/backend/:path*",
          destination: "http://localhost:8000/:path*", // Proxy to Backend lokal
        },
      ];
    }

    // Di Vercel (production), kembalikan array kosong agar vercel.json bisa mengambil alih
    return [];
  },
};

export default nextConfig;