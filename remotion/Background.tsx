// remotion/Background.tsx
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useTheme, withAlpha } from "./theme";

export const AnimatedBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const c = useTheme();
  const blob = (i: number, color: string, bx: number, by: number, r: number) => {
    const x = bx + Math.sin(frame / 90 + i) * 9;
    const y = by + Math.cos(frame / 110 + i) * 9;
    return `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, transparent ${r}%)`;
  };
  const bg = [
    blob(0, withAlpha(c.accent, 0.22), 24, 24, 36),
    blob(1, withAlpha(c.accent2, 0.15), 76, 30, 40),
    blob(2, withAlpha(c.accent, 0.10), 50, 82, 42),
  ].join(",");
  return <AbsoluteFill style={{ backgroundColor: c.bg, backgroundImage: bg }} />;
};

export const Grain: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      backgroundSize: "160px 160px", opacity: 0.07, mixBlendMode: "overlay", pointerEvents: "none",
    }}
  />
);

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, transparent 52%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
);

export const Progress: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  const c = useTheme();
  const w = interpolate(frame, [0, total], [0, 100], { extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", bottom: 0, left: 0, height: 8, width: `${w}%`, background: c.accent }} />;
};