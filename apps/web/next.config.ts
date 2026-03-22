import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config, { dir }) => {
    config.resolve.alias["@"] = dir;
    return config;
  },
};

export default nextConfig;
