// lib/music.ts
import { promises as fs } from "fs";
import path from "path";

const MUSIC_DIR = path.join(process.cwd(), "public", "music");

/** Pick a music track from /public/music, varied by seed. null if none present. */
export async function pickMusic(seed: string): Promise<string | null> {
  try {
    const files = (await fs.readdir(MUSIC_DIR)).filter((f) => /\.(mp3|m4a|wav|ogg)$/i.test(f));
    if (!files.length) return null;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return `/music/${files[Math.abs(h) % files.length]}`;
  } catch {
    return null;
  }
}