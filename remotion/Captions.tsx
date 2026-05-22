// remotion/Captions.tsx
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Word } from "@/lib/schema";
import { groupIntoLines } from "@/lib/captions";
import { theme, sans } from "./theme";

export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps; // seconds within this scene
  if (!words.length) return null;

  const lines = groupIntoLines(words, 4);
  let active =
    lines.find((l) => t >= l.start && t <= l.end + 0.35) ??
    lines.find((l) => t < l.start) ??
    lines[lines.length - 1];

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 230, padding: "0 80px", textAlign: "center" }}>
      <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 62, lineHeight: 1.25, textShadow: "0 6px 28px rgba(0,0,0,.65)" }}>
        {active.words.map((w, i) => (
          <span key={i} style={{ color: t >= w.start ? theme.accent2 : "#fff" }}>{w.text} </span>
        ))}
      </div>
    </div>
  );
};