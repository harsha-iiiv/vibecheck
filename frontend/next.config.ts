import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence Turbopack warnings — this project uses Turbopack (default in Next 16)
  turbopack: {},
};

export default nextConfig;
