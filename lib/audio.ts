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

/** Stitch all scene clips into one preview track. */
export async function buildMasterTrack(projectId: string, wavs: Buffer[]): Promise<string> {
  const pcm = Buffer.concat(wavs.map((w) => w.subarray(44))); // drop each header
  const master = wrapWav(pcm);
  const dir = path.join(PUBLIC_AUDIO, projectId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "master.wav"), master);
  return `/audio/${projectId}/master.wav`;
}

/** Run async work with a max number in flight (respects Falcon limits). */
export async function mapWithConcurrency<T, R>(
  items: T[], limit: number, fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function wrapWav(pcm: Buffer): Buffer {
  const byteRate = SAMPLE_RATE * CHANNELS * (BITS / 8);
  const blockAlign = CHANNELS * (BITS / 8);
  const dataSize = pcm.length;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + dataSize, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(CHANNELS, 22); h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(byteRate, 28); h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(BITS, 34); h.write("data", 36); h.writeUInt32LE(dataSize, 40);
  return Buffer.concat([h, pcm]);
}