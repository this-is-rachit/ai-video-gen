// remotion/theme.ts
import { loadFont as loadDisplay } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";

export const display = loadDisplay().fontFamily;
export const sans = loadSans().fontFamily;

export const theme = {
  bg: "#0E0E10",
  panel: "#17171B",
  text: "#FAFAF7",
  muted: "#9A9AA3",
  accent: "#FF5C38",   // coral
  accent2: "#FFD23F",  // amber (caption highlight)
};

export const VIDEO = { width: 1080, height: 1920, fps: 30 };