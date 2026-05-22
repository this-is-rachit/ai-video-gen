// remotion/Character.tsx
import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "./theme";

export const Mascot: React.FC<{ size?: number }> = ({ size = 170 }) => {
  const frame = useCurrentFrame();
  const c = useTheme();
  const bob = Math.sin(frame / 12) * 9;
  const blink = frame % 96 < 6 ? 0.12 : 1; // quick blink
  const eyeRy = 8 * blink;
  return (
    <div style={{ transform: `translateY(${bob}px)`, filter: `drop-shadow(0 0 30px ${c.accent}88)` }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill={c.accent} />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#ffffff22" strokeWidth="2" />
        <ellipse cx="38" cy="46" rx="6.5" ry={eyeRy} fill="#0b0b0c" />
        <ellipse cx="62" cy="46" rx="6.5" ry={eyeRy} fill="#0b0b0c" />
        <circle cx="40" cy="44" r="2" fill="#fff" />
        <circle cx="64" cy="44" r="2" fill="#fff" />
        <path d="M37 64 Q50 76 63 64" stroke="#0b0b0c" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
};