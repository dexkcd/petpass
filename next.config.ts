import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Pet documents (PDFs, photos) are uploaded through a server action.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
