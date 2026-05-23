// remotion/Captions.tsx
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Word } from "@/lib/schema";
import { groupIntoLines } from "@/lib/captions";
import { useTheme, useStyle, useLang, fontStackFor } from "./theme";
import { useLayout } from "./layout";

export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useTheme();
  const s = useStyle();
  const lang = useLang();
  const { captionBottom, captionFont, w } = useLayout();
  const t = frame / fps;
  if (!words.length) return null;

  const lines = groupIntoLines(words, 5);
  const active =
    lines.find((l) => t >= l.start && t <= l.end + 0.35) ??
    lines.find((l) => t < l.start) ??
    lines[lines.length - 1];

  // per-pack container styling
  const container: React.CSSProperties =
    s.caption === "pill" ? { background: "rgba(10,10,12,0.42)", borderRadius: 24, padding: "20px 34px" }
    : s.caption === "block" ? { background: c.accent, borderRadius: 6, padding: "16px 26px" }
    : s.caption === "bottombar" ? { background: "rgba(0,0,0,0.55)", borderRadius: 0, padding: "22px 40px", width: "100%", textAlign: "center" }
    : /* underline */ { background: "transparent", padding: "8px 10px" };

  const baseTextColor = s.caption === "block" ? c.bg : "#fff";
  const doneColor = s.caption === "block" ? c.bg : c.accent2;

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: captionBottom, display: "flex", justifyContent: "center", padding: s.caption === "bottombar" ? 0 : `0 ${Math.round(w * 0.06)}px` }}>
      <div style={{ ...container, maxWidth: s.caption === "bottombar" ? "100%" : Math.round(w * 0.86) }}>
          <div style={{ fontFamily: fontStackFor(s.bodyFont, lang), fontWeight: 700, fontSize: captionFont, lineHeight: 1.22, textAlign: "center", textShadow: s.caption === "underline" ? "0 4px 18px rgba(0,0,0,.7)" : "0 4px 18px rgba(0,0,0,.5)" }}>
          {active.words.map((wd, i) => {
            const spoken = t >= wd.start;
            const speaking = spoken && t < wd.end;
            return (
              <span key={i} style={{
                display: "inline-block",
                color: spoken ? doneColor : baseTextColor,
                transform: speaking ? "translateY(-6px)" : "none",
                borderBottom: s.caption === "underline" && spoken ? `5px solid ${c.accent}` : "5px solid transparent",
                paddingBottom: s.caption === "underline" ? 2 : 0,
              }}>
                {wd.text}&nbsp;
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};