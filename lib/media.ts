// lib/media.ts
// Server-side media processing for user uploads. Images are smart-cropped to a
// scene's exact pixels; videos are trimmed to a chosen [start,end] range and
// scaled/cropped to fill the frame. This lets the FROZEN renderer keep using
// plain objectFit:"cover" + play-from-start — all the fitting intelligence
// lives here, never in remotion/.
import sharp from "sharp";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

/** Target pixels for a media slot. Comparison halves are slivers; everything
 *  else fills the whole frame. Matches the renderer's layout. */
export function targetDims(aspect: string | undefined, field: string): { w: number; h: number } {
  const landscape = aspect === "landscape";
  if (field === "leftImageUrl" || field === "rightImageUrl") {
    return landscape ? { w: 960, h: 1080 } : { w: 1080, h: 960 };
  }
  return landscape ? { w: 1920, h: 1080 } : { w: 1080, h: 1920 };
}

/** Smart-crop + resize an image buffer to exactly w×h (focal region preserved). */
export async function fitImage(buf: Buffer, w: number, h: number): Promise<Buffer> {
  return await sharp(buf)
    .rotate() // honour EXIF orientation before cropping
    .resize(w, h, { fit: "cover", position: "attention" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

/** Trim [start,end] of a source video and scale/crop to fill w×h. Audio stripped
 *  (b_roll is muted in the renderer). Re-encoded to web-safe H.264. */
export async function processVideo(
  inputPath: string, outputPath: string, w: number, h: number, startSec: number, endSec: number
): Promise<void> {
  if (!ffmpegPath) throw new Error("ffmpeg binary unavailable");
  const start = Math.max(0, Number(startSec) || 0);
  const dur = Math.max(0.5, (Number(endSec) || 0) - start);
  const args = [
    "-y",
    "-ss", String(start),
    "-i", inputPath,
    "-t", String(dur),
    "-vf", `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
    "-an",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    outputPath,
  ];
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath as unknown as string, args);
    let err = "";
    proc.stderr.on("data", (d) => { err += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-300)}`))));
  });
}