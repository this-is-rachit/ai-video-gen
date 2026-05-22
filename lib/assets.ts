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
    if (isRemote(s.visual.imageUrl)) { const f = await downloadOne(s.visual.imageUrl!, dir, "img"); if (f) s.visual.imageUrl = localUrl(f); }
    if (isRemote(s.visual.bgImageUrl)) { const f = await downloadOne(s.visual.bgImageUrl!, dir, "img"); if (f) s.visual.bgImageUrl = localUrl(f); }
    if (isRemote(s.visual.bRollUrl)) { const f = await downloadOne(s.visual.bRollUrl!, dir, "vid"); if (f) s.visual.bRollUrl = localUrl(f); }
  }
  if (isRemote(p.musicUrl)) { const f = await downloadOne(p.musicUrl!, dir, "aud"); if (f) p.musicUrl = localUrl(f); }
  return p;
}