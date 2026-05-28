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
    let contentType = CONTENT_TYPES[ext] || "application/octet-stream";

    // Defensive: sniff the first 12 bytes and override Content-Type if the
    // extension lies about what's inside. Falcon TTS returns WAV-wrapped PCM
    // but the save path uses a generic ".mp3" extension; without this,
    // headless Chromium tries to decode WAV as MPEG audio and emits silence.
    if (data.length >= 12) {
      const head4 = data.subarray(0, 4).toString("ascii");
      const head8to12 = data.subarray(8, 12).toString("ascii");
      if (head4 === "RIFF" && head8to12 === "WAVE") contentType = "audio/wav";
      else if (head4 === "OggS") contentType = "audio/ogg";
      else if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) contentType = "audio/mpeg"; // ID3
      else if (data[0] === 0xff && (data[1] & 0xe0) === 0xe0) contentType = "audio/mpeg"; // MPEG sync
    }
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