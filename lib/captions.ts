// lib/captions.ts
import { Word, Scene } from "./schema";

/**
 * Distribute words across a scene's known duration.
 * Weight = base + letter count; punctuation adds a pause.
 * Timings are RELATIVE to the scene's start (each scene self-contained).
 */
export function estimateWordTimings(narration: string, durationSeconds: number): Word[] {
  const tokens = narration.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || durationSeconds <= 0) return [];

  const weights = tokens.map((t) => {
    const chars = (t.match(/[\p{L}\p{N}]/gu) || []).length || 1; // unicode-aware (Hindi etc.)
    let w = 1 + chars;
    if (/[,;:]$/.test(t)) w += 2;        // short pause
    if (/[.!?…]$/.test(t)) w += 4;       // longer pause
    return w;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  return tokens.map((tok, i) => {
    const dur = (weights[i] / total) * durationSeconds;
    const word: Word = { text: tok, start: +cursor.toFixed(3), end: +(cursor + dur).toFixed(3) };
    cursor += dur;
    return word;
  });
}

/** Group words into readable caption lines (for the karaoke overlay in Phase 6). */
export function groupIntoLines(words: Word[], maxWords = 5): { text: string; start: number; end: number; words: Word[] }[] {
  const lines = [];
  for (let i = 0; i < words.length; i += maxWords) {
    const chunk = words.slice(i, i + maxWords);
    lines.push({
      text: chunk.map((w) => w.text).join(" "),
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      words: chunk,
    });
  }
  return lines;
}

/** Fill scene.words only when empty — real alignment data (if added later) wins. */
export function ensureSceneWords(scene: Scene, fps: number): Scene {
  if (scene.words.length > 0) return scene;
  if (!scene.durationFrames) return scene;
  const seconds = scene.durationFrames / fps;
  scene.words = estimateWordTimings(scene.narration, seconds);
  return scene;
}