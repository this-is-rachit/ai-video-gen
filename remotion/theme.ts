// remotion/theme.ts
import { createContext, useContext } from "react";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadArchivo } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";

// base fonts (kept for back-compat with existing imports)
export const display = loadFraunces().fontFamily;
export const sans = loadDMSans().fontFamily;
export const hand = loadCaveat().fontFamily;

// extra fonts for style packs
const fArchivo = loadArchivo().fontFamily;
const fSpace = loadSpaceGrotesk().fontFamily;
const fPlayfair = loadPlayfair().fontFamily;
const fInter = loadInter().fontFamily;
const fBebas = loadBebas().fontFamily;

export function dimensions(aspect?: string) {
  return aspect === "landscape"
    ? { width: 1920, height: 1080, fps: 30 }
    : { width: 1080, height: 1920, fps: 30 };
}
export const VIDEO = dimensions("portrait");

export interface Palette { bg: string; text: string; muted: string; accent: string; accent2: string; }

export const PALETTES: Palette[] = [
  { bg: "#0E0E10", text: "#FAFAF7", muted: "#9A9AA3", accent: "#FF5C38", accent2: "#FFD23F" },
  { bg: "#0A0F14", text: "#EAF6FF", muted: "#7E94A6", accent: "#37C2FF", accent2: "#7CFFC4" },
  { bg: "#120A16", text: "#F8EEFF", muted: "#A38BB0", accent: "#B14AFF", accent2: "#FF6FD8" },
  { bg: "#0B0F0B", text: "#EFFCEF", muted: "#86A186", accent: "#3DDC84", accent2: "#D6FF4B" },
  { bg: "#140D0A", text: "#FFF3EC", muted: "#B0938A", accent: "#FF7A18", accent2: "#FFC83D" },
  { bg: "#0C0C12", text: "#F0F0FF", muted: "#8A8AA0", accent: "#5B6CFF", accent2: "#33E0E0" },
];

// ---------- STYLE PACKS ----------
export type CaptionStyle = "pill" | "underline" | "block" | "bottombar";
export type Motion = "smooth" | "snappy" | "bouncy" | "elegant";

export interface StylePack {
  id: string;
  displayFont: string;   // headings
  bodyFont: string;      // body/subtitle
  titleWeight: number;
  uppercaseTitles: boolean;
  letterSpacing: number; // px on titles
  caption: CaptionStyle;
  motion: Motion;
  grain: boolean;
}

export const PACKS: Record<string, StylePack> = {
  editorial: { id: "editorial", displayFont: fPlayfair, bodyFont: fInter, titleWeight: 700, uppercaseTitles: false, letterSpacing: 0, caption: "underline", motion: "elegant", grain: true },
  boldpop:   { id: "boldpop",   displayFont: fArchivo,  bodyFont: fInter, titleWeight: 900, uppercaseTitles: true,  letterSpacing: 1, caption: "block",     motion: "snappy",  grain: false },
  cinematic: { id: "cinematic", displayFont: display,   bodyFont: sans,   titleWeight: 600, uppercaseTitles: false, letterSpacing: 0, caption: "bottombar", motion: "elegant", grain: true },
  tech:      { id: "tech",      displayFont: fSpace,    bodyFont: fSpace, titleWeight: 700, uppercaseTitles: false, letterSpacing: 0, caption: "pill",      motion: "snappy",  grain: false },
  retro:     { id: "retro",     displayFont: fBebas,    bodyFont: fInter, titleWeight: 400, uppercaseTitles: true,  letterSpacing: 2, caption: "block",     motion: "bouncy",  grain: true },
  minimal:   { id: "minimal",   displayFont: fInter,    bodyFont: fInter, titleWeight: 800, uppercaseTitles: false, letterSpacing: -1, caption: "pill",     motion: "smooth",  grain: false },
};
const PACK_ORDER = ["editorial", "boldpop", "cinematic", "tech", "retro", "minimal"];

// topic → pack hints (fallback = deterministic by hash)
const PACK_RULES: { pack: string; keys: string[] }[] = [
  { pack: "cinematic", keys: ["war", "empire", "history", "space", "universe", "black hole", "ocean", "ancient", "rome", "galaxy", "cosmos"] },
  { pack: "tech",      keys: ["ai", "computer", "internet", "gps", "technology", "software", "code", "data", "robot", "quantum", "cyber"] },
  { pack: "boldpop",   keys: ["top 10", "fun", "weird", "amazing", "facts", "surprising", "myth", "trivia", "hack", "richest", "biggest"] },
  { pack: "editorial", keys: ["money", "finance", "invest", "economy", "business", "market", "vaccine", "health", "science", "brain", "philosophy"] },
  { pack: "retro",     keys: ["music", "80s", "retro", "vintage", "game", "movie", "art", "culture", "fashion"] },
];

export function packFor(topic: string, hint?: string | null): StylePack {
  if (hint && PACKS[hint]) return PACKS[hint];
  const t = (topic || "").toLowerCase();
  for (const r of PACK_RULES) if (r.keys.some((k) => t.includes(k))) return PACKS[r.pack];
  return PACKS[PACK_ORDER[hashString(topic || "default") % PACK_ORDER.length]];
}

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export function themeFor(topic: string): Palette {
  return PALETTES[hashString(topic || "default") % PALETTES.length];
}
export function withAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// spring config per motion personality
export function springFor(motion: Motion) {
  switch (motion) {
    case "snappy": return { damping: 26, stiffness: 180, mass: 0.7 };
    case "bouncy": return { damping: 12, stiffness: 140, mass: 0.9 };
    case "elegant": return { damping: 200 };
    case "smooth":
    default: return { damping: 40, stiffness: 110, mass: 1 };
  }
}

export const ThemeContext = createContext<Palette>(PALETTES[0]);
export const useTheme = () => useContext(ThemeContext);

export const StyleContext = createContext<StylePack>(PACKS.cinematic);
export const useStyle = () => useContext(StyleContext);