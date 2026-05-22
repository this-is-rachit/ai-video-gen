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

async function downloadOne(url: string, destDir: string): Promise<string | null> {
  try {
    const hash = crypto.createHash("md5").update(url).digest("hex").slice(0, 16);
    const looksVideo = /\/video|\.mp4|\.mov|\.webm/i.test(url);
    const file = `${hash}${extFromUrl(url, looksVideo ? ".mp4" : ".jpg")}`;
    const dest = path.join(destDir, file);
    try { await fs.access(dest); return file; } catch {}        // cache hit
    const res = await fetch(url);
    if (!res.ok) return null;
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return file;
  } catch { return null; }
}

/** Download remote image/video assets to /public/cache/<id> and return a clone with local URLs. */
export async function localizeAssets(project: Project): Promise<Project> {
  const dir = path.join(CACHE_DIR, project.id);
  await fs.mkdir(dir, { recursive: true });
  const p: Project = JSON.parse(JSON.stringify(project));
  const isRemote = (u?: string | null) => !!u && /^https?:\/\//i.test(u);
  const localUrl = (file: string) => `/cache/${p.id}/${file}`;

  for (const s of p.scenes) {
    for (const key of ["imageUrl", "bgImageUrl", "bRollUrl"] as const) {
      const u = (s.visual as any)[key] as string | null | undefined;
      if (isRemote(u)) {
        const f = await downloadOne(u!, dir);
        if (f) (s.visual as any)[key] = localUrl(f);
      }
    }
  }
  return p; // audio + music are already local
}