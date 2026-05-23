// lib/audio.ts
import { promises as fs } from "fs";
import path from "path";

const SAMPLE_RATE = 24000, CHANNELS = 1, BITS = 16;
const BYTES_PER_SEC = SAMPLE_RATE * CHANNELS * (BITS / 8); // 48000
const PUBLIC_AUDIO = path.join(process.cwd(), "public", "audio");

/** Exact duration from a WAV buffer (payload = total minus 44-byte header). */
export function wavDurationSeconds(wav: Buffer): number {
  return Math.max(0, wav.length - 44) / BYTES_PER_SEC;
}

export async function saveSceneAudio(projectId: string, sceneId: string, wav: Buffer): Promise<string> {
  const dir = path.join(PUBLIC_AUDIO, projectId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${sceneId}.wav`), wav);
  return `/audio/${projectId}/${sceneId}.wav`; // usable by <audio> now and Remotion later
}