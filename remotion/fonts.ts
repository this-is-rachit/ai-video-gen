// remotion/fonts.ts
// Per-language font loading for non-Latin scripts. Latin-script languages reuse
// the style-pack fonts (already loaded in theme.ts) and need nothing here.
//
// IMPORTANT: CJK/Indic Noto fonts are large. We scope each loadFont() to the
// subset(s) it needs so the render doesn't time out fetching megabytes of glyphs.

import { loadFont as loadDevanagari } from "@remotion/google-fonts/NotoSansDevanagari";
import { loadFont as loadBengali } from "@remotion/google-fonts/NotoSansBengali";
import { loadFont as loadJP } from "@remotion/google-fonts/NotoSansJP";
import { loadFont as loadKR } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadSC } from "@remotion/google-fonts/NotoSansSC";

// Load each non-Latin font once at module top (render-safe: blocks frames until ready).
const devanagari = loadDevanagari("normal", { weights: ["400", "700"], subsets: ["devanagari", "latin"] }).fontFamily;
const bengali    = loadBengali("normal",    { weights: ["400", "700"], subsets: ["bengali", "latin"] }).fontFamily;
const jp         = loadJP("normal",         { weights: ["400", "700"], subsets: ["latin"] }).fontFamily; // JP glyphs ship in the base file
const kr         = loadKR("normal",         { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
const sc         = loadSC("normal",         { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

/**
 * Returns the script font for a locale, or null for Latin-script languages
 * (which need no extra font — the pack fonts already cover them).
 */
export function langFontFor(locale?: string | null): string | null {
  const base = (locale || "").toLowerCase();
  if (base.startsWith("hi") || base.startsWith("mr")) return devanagari; // Hindi, Marathi
  if (base.startsWith("bn")) return bengali;                              // Bengali
  if (base.startsWith("ja")) return jp;                                  // Japanese
  if (base.startsWith("ko")) return kr;                                  // Korean
  if (base.startsWith("zh")) return sc;                                  // Chinese (Simplified)
  return null; // en, es, fr, de, pt, it, etc. → Latin pack fonts are fine
}