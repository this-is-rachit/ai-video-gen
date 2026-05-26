// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler", "esbuild", "sharp", "ffmpeg-static"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      (config.externals as any[]).push(({ request }: any, cb: any) => {
        if (
          request &&
          (request.endsWith(".node") ||
            request.includes("@rspack/binding") ||
            request.includes("@remotion/compositor") ||
            request.includes("@esbuild"))
        ) {
          return cb(null, "commonjs " + request);
        }
        cb();
      });
    }
    return config;
  },
};
export default nextConfig;