// remotion/layout.ts
import { useVideoConfig } from "remotion";

export function useLayout() {
  const { width: w, height: h } = useVideoConfig();
  const landscape = w > h;
  return {
    w, h, landscape,
    fontScale: landscape ? 0.82 : 1,
    safe: {
      x: Math.round(w * 0.075),
      top: Math.round(h * 0.07),
      bottom: Math.round(h * (landscape ? 0.2 : 0.2)),
    },
    captionBottom: Math.round(h * (landscape ? 0.07 : 0.115)),
    captionFont: landscape ? 46 : 60,
  };
}