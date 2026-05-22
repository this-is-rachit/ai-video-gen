// lib/assets.ts
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { Project } from "./schema";

const CACHE_DIR = path.join(process.cwd(), "public", "cache");

function extFromUrl(u: string, fallback: string): string {
  const m = u.split("?")[0].match(/\.(jpe?g|png|webp|mp4|mov|webm|mp3|m4a|wav|ogg)$/i);
  return m ? m[0].toLowerCase() : fallback;
}

async function downloadOne(url: string, destDir: string, kind: "img" | "vid" | "aud"): Promise<string | null> {
  try {
    const hash = crypto.createHash("md5").update(url).digest("hex").slice(0, 16);
    const fb = kind === "vid" ? ".mp4" : kind === "aud" ? ".mp3" : ".jpg";
    const file = `${hash}${extFromUrl(url, fb)}`;
    const dest = path.join(destDir, file);
    try { await fs.access(dest); return file; } catch {}
    const res = await fetch(url);
    if (!res.ok) return null;
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return file;
  } catch { return null; }
}

/** Download remote image/video/music to /public/cache/<id> and return a clone with local URLs. */
export async function localizeAssets(project: Project): Promise<Project> {
  const dir = path.join(CACHE_DIR, project.id);
  await fs.mkdir(dir, { recursive: true });
  const p: Project = JSON.parse(JSON.stringify(project));
  const isRemote = (u?: string | null) => !!u && /^https?:\/\//i.test(u);
  const localUrl = (file: string) => `/cache/${p.id}/${file}`;

  for (const s of p.scenes) {
    const v: any = s.visual;
    if (isRemote(v.imageUrl)) { const f = await downloadOne(v.imageUrl!, dir, "img"); if (f) v.imageUrl = localUrl(f); }
    if (isRemote(v.bgImageUrl)) { const f = await downloadOne(v.bgImageUrl!, dir, "img"); if (f) v.bgImageUrl = localUrl(f); }
    if (isRemote(v.bRollUrl)) { const f = await downloadOne(v.bRollUrl!, dir, "vid"); if (f) v.bRollUrl = localUrl(f); }

    // montage: array of image URLs
    if (Array.isArray(v.imageUrls)) {
      const out: string[] = [];
      for (const u of v.imageUrls) {
        if (isRemote(u)) { const f = await downloadOne(u, dir, "img"); out.push(f ? localUrl(f) : u); }
        else out.push(u);
      }
      v.imageUrls = out;
    }

    // comparison: left / right images
    if (isRemote(v.leftImageUrl)) { const f = await downloadOne(v.leftImageUrl!, dir, "img"); if (f) v.leftImageUrl = localUrl(f); }
    if (isRemote(v.rightImageUrl)) { const f = await downloadOne(v.rightImageUrl!, dir, "img"); if (f) v.rightImageUrl = localUrl(f); }
  }

  if (isRemote(p.musicUrl)) { const f = await downloadOne(p.musicUrl!, dir, "aud"); if (f) p.musicUrl = localUrl(f); }
  return p;
}