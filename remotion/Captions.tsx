// remotion/Captions.tsx
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Word } from "@/lib/schema";
import { groupIntoLines } from "@/lib/captions";
import { useTheme, sans } from "./theme";
import { useLayout } from "./layout";

export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useTheme();
  const { captionBottom, captionFont, w } = useLayout();
  const t = frame / fps;
  if (!words.length) return null;

  const lines = groupIntoLines(words, 5);
  const active =
    lines.find((l) => t >= l.start && t <= l.end + 0.35) ??
    lines.find((l) => t < l.start) ??
    lines[lines.length - 1];

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: captionBottom, display: "flex", justifyContent: "center", padding: `0 ${Math.round(w * 0.06)}px` }}>
      <div style={{ background: "rgba(10,10,12,0.42)", borderRadius: 24, padding: "20px 34px", maxWidth: Math.round(w * 0.86) }}>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: captionFont, lineHeight: 1.22, textAlign: "center", textShadow: "0 4px 18px rgba(0,0,0,.5)" }}>
          {active.words.map((wd, i) => (
            <span key={i} style={{ display: "inline-block", color: t >= wd.start ? c.accent2 : "#fff", transform: t >= wd.start && t < wd.end ? "translateY(-6px)" : "none" }}>
              {wd.text}&nbsp;
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};