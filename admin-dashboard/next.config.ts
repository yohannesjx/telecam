import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ?? "https://camera.iglooks.com/api";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const target = apiProxyTarget.replace(/\/$/, "");
    return [
      {
        source: "/api/backend/:path*",
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
