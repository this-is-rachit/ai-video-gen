// remotion/text.ts
// Deterministic font sizing so text always fits 1080x1920 (render-safe, no DOM measuring).
export const SAFE = { x: 96, top: 120, bottom: 380 }; // bottom reserves the caption zone

export function fitTitle(text = ""): number {
  const n = text.length;
  if (n <= 16) return 128;
  if (n <= 26) return 108;
  if (n <= 40) return 88;
  if (n <= 60) return 70;
  if (n <= 85) return 56;
  if (n <= 120) return 46;
  return 38;
}
export function fitBody(text = ""): number {
  const n = text.length;
  if (n <= 30) return 56;
  if (n <= 60) return 48;
  if (n <= 100) return 40;
  return 34;
}
export function fitQuote(text = ""): number {
  const n = text.length;
  if (n <= 60) return 82;
  if (n <= 120) return 62;
  if (n <= 200) return 48;
  return 40;
}