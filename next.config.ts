// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler", "esbuild", "sharp", "ffmpeg-static"],
  // Route /cache/* and /videos/* through our /api/asset route. Next.js's
  // built-in public/ static serving only exposes files that existed at BUILD
  // time, but we write voice audio, cached media, and final MP4s at runtime.
  // Rewrites are transparent: URLs in the UI and project state stay clean
  // (/cache/foo.jpg, /videos/proj_xxx.mp4) — Next internally forwards them.
  async rewrites() {
    // beforeFiles, not afterFiles (the default for array returns). When this
    // returns an array, Next checks the filesystem FIRST and serves public/*
    // files directly with extension-based Content-Type — which means our
    // /api/asset/ sniff never runs and WAV-as-".mp3" gets served as audio/mpeg,
    // making the studio Player silent (browsers reject MIME-content mismatch).
    // beforeFiles forces the rewrite to win, always routing through our API.
    return {
      beforeFiles: [
        { source: "/cache/:path*",  destination: "/api/asset/cache/:path*"  },
        { source: "/videos/:path*", destination: "/api/asset/videos/:path*" },
      ],
    };
  },
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