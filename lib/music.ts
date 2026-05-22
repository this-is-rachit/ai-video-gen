// lib/music.ts
import { promises as fs } from "fs";
import path from "path";

const MUSIC_DIR = path.join(process.cwd(), "public", "music");

export interface Music { url: string; credit: string }

// deterministic mood per topic so it varies but is stable per project
const MOODS = ["cinematic", "ambient", "uplifting", "corporate", "lofi", "epic", "calm", "electronic"];
function moodFor(seed: string): string {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return MOODS[Math.abs(h) % MOODS.length];
}

async function fromJamendo(seed: string): Promise<Music | null> {
  const id = process.env.JAMENDO_CLIENT_ID;
  if (!id) return null;
  const mood = moodFor(seed);
  const offset = Math.abs(seed.length * 7) % 20;
  const url =
    `https://api.jamendo.com/v3.0/tracks/?client_id=${id}&format=json&limit=1&offset=${offset}` +
    `&audioformat=mp32&vocalinstrumental=instrumental&include=musicinfo&order=popularity_total` +
    `&fuzzytags=${encodeURIComponent(mood)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const t = data?.results?.[0];
    if (!t?.audio) return null;
    return { url: t.audio, credit: `Music: ${t.name} by ${t.artist_name} (Jamendo)` };
  } catch { return null; }
}

async function fromLocal(seed: string): Promise<Music | null> {
  try {
    const files = (await fs.readdir(MUSIC_DIR)).filter((f) => /\.(mp3|m4a|wav|ogg)$/i.test(f));
    if (!files.length) return null;
    let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return { url: `/music/${files[Math.abs(h) % files.length]}`, credit: "Music: local track" };
  } catch { return null; }
}

/** Dynamic music: try Jamendo first, fall back to any local file, else null. */
export async function pickMusic(seed: string): Promise<Music | null> {
  return (await fromJamendo(seed)) || (await fromLocal(seed));
}