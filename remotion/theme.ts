// remotion/theme.ts
import { createContext, useContext } from "react";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadHand } from "@remotion/google-fonts/Caveat";

export const display = loadDisplay().fontFamily;
export const sans = loadSans().fontFamily;
export const hand = loadHand().fontFamily;

export function dimensions(aspect?: string) {
  return aspect === "landscape"
    ? { width: 1920, height: 1080, fps: 30 }
    : { width: 1080, height: 1920, fps: 30 };
}
export const VIDEO = dimensions("portrait");

export interface Palette { bg: string; text: string; muted: string; accent: string; accent2: string; }

export const PALETTES: Palette[] = [
  { bg: "#0E0E10", text: "#FAFAF7", muted: "#9A9AA3", accent: "#FF5C38", accent2: "#FFD23F" }, // coral/amber
  { bg: "#0A0F14", text: "#EAF6FF", muted: "#7E94A6", accent: "#37C2FF", accent2: "#7CFFC4" }, // cyan/mint
  { bg: "#120A16", text: "#F8EEFF", muted: "#A38BB0", accent: "#B14AFF", accent2: "#FF6FD8" }, // violet/pink
  { bg: "#0B0F0B", text: "#EFFCEF", muted: "#86A186", accent: "#3DDC84", accent2: "#D6FF4B" }, // green/lime
  { bg: "#140D0A", text: "#FFF3EC", muted: "#B0938A", accent: "#FF7A18", accent2: "#FFC83D" }, // orange
  { bg: "#0C0C12", text: "#F0F0FF", muted: "#8A8AA0", accent: "#5B6CFF", accent2: "#33E0E0" }, // indigo/teal
];

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

export const ThemeContext = createContext<Palette>(PALETTES[0]);
export const useTheme = () => useContext(ThemeContext);