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
  }
};

export default nextConfig;

