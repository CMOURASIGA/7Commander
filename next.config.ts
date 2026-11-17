import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Skills are read from the filesystem at runtime. Include them in serverless bundles.
  outputFileTracingIncludes: {"/*": ["./prompts/**/*"]},
};

export default nextConfig;
