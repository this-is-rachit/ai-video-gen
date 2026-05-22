// lib/music.ts
import { promises as fs } from "fs";
import path from "path";

const MUSIC_DIR = path.join(process.cwd(), "public", "music");

export interface Music { url: string; credit: string; mood: string }

const MOOD_RULES: { label: string; tags: string[]; keys: string[] }[] = [
  { label: "epic / cinematic", tags: ["epic", "cinematic"], keys: ["war", "battle", "empire", "revolution", "history", "ancient", "rome", "roman", "king", "army", "conquer", "fall of", "medieval", "dynasty", "rise of"] },
  { label: "ambient / cosmic", tags: ["ambient", "cinematic"], keys: ["space", "universe", "galaxy", "black hole", "planet", "star", "cosmos", "quantum", "physics", "astronomy", "gravity", "atom", "nebula"] },
  { label: "calm / nature", tags: ["calm", "ambient"], keys: ["ocean", "nature", "forest", "animal", "plant", "photosynthesis", "weather", "climate", "earth", "water", "ecosystem", "river", "wildlife"] },
  { label: "corporate / uplifting", tags: ["corporate", "uplifting"], keys: ["money", "invest", "finance", "business", "economy", "interest", "market", "startup", "success", "productivity", "career", "wealth", "profit", "stock"] },
  { label: "electronic / tech", tags: ["electronic", "technology"], keys: ["ai", "computer", "internet", "gps", "technology", "robot", "code", "software", "algorithm", "data", "machine", "cyber", "digital", "chip"] },
  { label: "playful / upbeat", tags: ["happy", "upbeat"], keys: ["fun", "fact", "weird", "amazing", "top 10", "interesting", "cool", "surprising", "myth", "trivia", "bizarre", "strange", "hack"] },
  { label: "inspiring", tags: ["inspiring", "uplifting"], keys: ["health", "vaccine", "science", "discovery", "future", "learn", "education", "brain", "memory", "mind", "body", "medicine", "human"] },
];
const DEFAULT_MOOD = { label: "cinematic / ambient", tags: ["cinematic", "ambient"] };

function moodFor(text: string): { label: string; tags: string[] } {
  const t = text.toLowerCase();
  let best = DEFAULT_MOOD, bestScore = 0;
  for (const r of MOOD_RULES) {
    const score = r.keys.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
    if (score > bestScore) { bestScore = score; best = { label: r.label, tags: r.tags }; }
  }
  return best;
}

function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

async function fromJamendo(topic: string, extra: string): Promise<Music | null> {
  const id = process.env.JAMENDO_CLIENT_ID;
  if (!id) return null;
  const { label, tags } = moodFor(`${topic} ${extra}`);
  const offset = hash(topic) % 25;
  const url =
    `https://api.jamendo.com/v3.0/tracks/?client_id=${id}&format=json&limit=1&offset=${offset}` +
    `&audioformat=mp32&vocalinstrumental=instrumental&include=musicinfo&order=popularity_total` +
    `&fuzzytags=${encodeURIComponent(tags.join("+"))}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const t = data?.results?.[0];
    if (!t?.audio) return null;
    return { url: t.audio, credit: `Music: ${t.name} by ${t.artist_name} (Jamendo, CC)`, mood: label };
  } catch { return null; }
}

async function fromLocal(topic: string): Promise<Music | null> {
  try {
    const files = (await fs.readdir(MUSIC_DIR)).filter((f) => /\.(mp3|m4a|wav|ogg)$/i.test(f));
    if (!files.length) return null;
    return { url: `/music/${files[hash(topic) % files.length]}`, credit: "Music: local track", mood: moodFor(topic).label };
  } catch { return null; }
}

/** Topic-aware dynamic music: Jamendo by mood, local fallback. */
export async function pickMusic(topic: string, extra = ""): Promise<Music | null> {
  return (await fromJamendo(topic, extra)) || (await fromLocal(topic));
}