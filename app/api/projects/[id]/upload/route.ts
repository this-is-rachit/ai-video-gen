// app/api/projects/[id]/upload/route.ts
// Save a user-uploaded image/video into public/uploads/<id>/ and wire it into a
// scene's existing media URL field. Images are smart-cropped to the scene's
// exact pixels; videos are trimmed to a chosen range and fitted to the frame.
// The frozen renderer reads the URL field as-is, so uploads render identically
// to stock media. Processing failures fall back to the raw file + a warning.
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getProject, saveProject } from "@/lib/store";
import { rateLimit, clientIp, LIMITS } from "@/lib/ratelimit";
import { targetDims, fitImage, processVideo } from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_FIELDS = new Set(["imageUrl", "bgImageUrl", "bRollUrl", "leftImageUrl", "rightImageUrl", "imageUrls"]);
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB — comfortably fits phone clips

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(`upload:${clientIp(req)}`, LIMITS.edit);
  if (!rl.ok) {
    return NextResponse.json({ error: `Too many uploads from this device. Please wait about ${rl.retryAfterSec}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  try {
    const { id } = await params;
    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    const sceneId = String(form.get("sceneId") || "");
    const field = String(form.get("field") || "");
    const indexRaw = form.get("index");
    const index = indexRaw != null && indexRaw !== "" ? Number(indexRaw) : null;
    const startSec = Number(form.get("startSec") || 0);
    const endSec = Number(form.get("endSec") || 0);

    if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    if (!ALLOWED_FIELDS.has(field)) return NextResponse.json({ error: "Invalid media slot." }, { status: 400 });

    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene) return NextResponse.json({ error: "Scene not found." }, { status: 404 });

    const type = (file.type || "").toLowerCase();
    const wantsVideo = field === "bRollUrl";
    if (wantsVideo && !type.startsWith("video/")) return NextResponse.json({ error: "This scene uses moving footage — please upload a video clip." }, { status: 400 });
    if (!wantsVideo && !type.startsWith("image/")) return NextResponse.json({ error: "Please upload an image (JPG, PNG, WebP)." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 200 MB)." }, { status: 400 });

    const dir = path.join(process.cwd(), "public", "uploads", id);
    await fs.mkdir(dir, { recursive: true });
    const { w, h } = targetDims(project.aspect, field);
    const inputBytes = Buffer.from(await file.arrayBuffer());
    let warning = "";
    let url = "";

    if (wantsVideo) {
      // write raw to a temp file, trim+fit into the final mp4, drop the temp.
      const tmp = path.join(dir, `.tmp-${randomUUID().slice(0, 8)}`);
      const fname = `${randomUUID().slice(0, 8)}.mp4`;
      const out = path.join(dir, fname);
      await fs.writeFile(tmp, inputBytes);
      try {
        await processVideo(tmp, out, w, h, startSec, endSec);
        url = `/uploads/${id}/${fname}`;
      } catch (e: any) {
        // fall back: keep the raw upload so the user isn't blocked
        const rawName = `${randomUUID().slice(0, 8)}.${(type.split("/")[1] || "mp4").replace("quicktime", "mov")}`;
        await fs.writeFile(path.join(dir, rawName), inputBytes);
        url = `/uploads/${id}/${rawName}`;
        warning = "Couldn’t auto-trim/fit this clip, so the original was used. It may not fill the frame perfectly.";
        console.warn(`[upload] video processing failed: ${e?.message || e}`);
      } finally {
        await fs.unlink(tmp).catch(() => {});
      }
    } else {
      const fname = `${randomUUID().slice(0, 8)}.jpg`;
      try {
        const fitted = await fitImage(inputBytes, w, h);
        await fs.writeFile(path.join(dir, fname), fitted);
        url = `/uploads/${id}/${fname}`;
      } catch (e: any) {
        const rawName = `${randomUUID().slice(0, 8)}.${(type.split("/")[1] || "jpg").replace("jpeg", "jpg")}`;
        await fs.writeFile(path.join(dir, rawName), inputBytes);
        url = `/uploads/${id}/${rawName}`;
        warning = "Couldn’t auto-fit this image, so the original was used.";
        console.warn(`[upload] image processing failed: ${e?.message || e}`);
      }
    }

    const v: any = scene.visual;
    if (field === "imageUrls") {
      const arr = Array.isArray(v.imageUrls) ? [...v.imageUrls] : [];
      const i = Number.isFinite(index) && (index as number) >= 0 ? (index as number) : arr.length;
      arr[i] = url;
      v.imageUrls = arr;
    } else {
      v[field] = url;
      if (field === "imageUrl") v.imageCredit = null;
      if (field === "bRollUrl") v.bRollCredit = null;
    }
    v.userUploaded = true;

    const saved = await saveProject(project);
    return NextResponse.json({ ...saved, warning });
  } catch (e: any) {
    console.error("[upload route] failed:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}