// remotion/Captions.tsx
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Word } from "@/lib/schema";
import { groupIntoLines } from "@/lib/captions";
import { useTheme, sans } from "./theme";

export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useTheme();
  const t = frame / fps;
  if (!words.length) return null;

  const lines = groupIntoLines(words, 4);
  const active =
    lines.find((l) => t >= l.start && t <= l.end + 0.35) ??
    lines.find((l) => t < l.start) ??
    lines[lines.length - 1];

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 220, display: "flex", justifyContent: "center", padding: "0 60px" }}>
      <div style={{ background: "rgba(10,10,12,0.42)", borderRadius: 24, padding: "22px 36px", maxWidth: 940 }}>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 60, lineHeight: 1.22, textAlign: "center", textShadow: "0 4px 18px rgba(0,0,0,.5)" }}>
          {active.words.map((w, i) => {
            const spoken = t >= w.start;
            const current = t >= w.start && t < w.end;
            return (
              <span key={i} style={{ display: "inline-block", color: spoken ? c.accent2 : "#fff", transform: current ? "translateY(-6px)" : "none" }}>
                {w.text}&nbsp;
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};