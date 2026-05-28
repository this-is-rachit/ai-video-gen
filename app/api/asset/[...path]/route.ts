// app/api/asset/[...path]/route.ts
//
// Serves files from public/* on disk PER REQUEST.
// Exists because Next.js production only serves files that existed in public/
// at BUILD time — files we write at runtime (Falcon voice audio, downloaded
// Pexels media, Jamendo music, cached images) would otherwise 404 with the
// app's HTML 404 page (which Chrome's ORB then blocks as a format mismatch).
// Dev mode reads from disk per request, hiding this in development.
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".mp4":  "video/mp4",
  ".mov":  "video/quicktime",
  ".webm": "video/webm",
  ".mp3":  "audio/mpeg",
  ".m4a":  "audio/mp4",
  ".wav":  "audio/wav",
  ".ogg":  "audio/ogg",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;
  if (!parts || parts.length === 0 || parts.some((p) => !p || p.includes("..") || p.includes("\\"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const publicDir = path.join(process.cwd(), "public");
  const filePath = path.join(publicDir, ...parts);
  // Defense in depth: ensure resolved path stays inside public/
  if (!filePath.startsWith(publicDir + path.sep)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (e: any) {
    console.error(`[api/asset] 404 ${filePath}: ${e.message}`);
    return new NextResponse("Not found", { status: 404 });
  }
}

// Never cache this route at the framework level — content is dynamic.
export const dynamic = "force-dynamic";