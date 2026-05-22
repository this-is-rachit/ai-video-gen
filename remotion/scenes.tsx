// remotion/scenes.tsx
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Visual } from "@/lib/schema";
import { theme, display, sans } from "./theme";

const useEnter = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, config: { damping: 200 } });
};

export const TitleCard: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 28%, #1d1d24, ${theme.bg})`, justifyContent: "center", alignItems: "center", padding: 90 }}>
      <div style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [50, 0])}px)`, textAlign: "center" }}>
        <div style={{ width: 70, height: 6, background: theme.accent, borderRadius: 99, margin: "0 auto 44px" }} />
        <h1 style={{ fontFamily: display, fontSize: 124, lineHeight: 1.02, color: theme.text, margin: 0, fontWeight: 600 }}>{visual.title}</h1>
        {visual.subtitle && <p style={{ fontFamily: sans, fontSize: 46, color: theme.muted, marginTop: 36 }}>{visual.subtitle}</p>}
      </div>
    </AbsoluteFill>
  );
};

export const BulletReveal: React.FC<{ visual: Visual }> = ({ visual }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bullets = visual.bullets ?? [];
  return (
    <AbsoluteFill style={{ background: theme.bg, justifyContent: "center", padding: 90 }}>
      {visual.title && <h2 style={{ fontFamily: display, fontSize: 76, color: theme.text, marginBottom: 60 }}>{visual.title}</h2>}
      {bullets.map((b, i) => {
        const local = spring({ frame: frame - i * 8, fps, config: { damping: 200 } });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 40, opacity: local, transform: `translateX(${interpolate(local, [0, 1], [-40, 0])}px)` }}>
            <div style={{ width: 18, height: 18, borderRadius: 99, background: theme.accent, flexShrink: 0 }} />
            <span style={{ fontFamily: sans, fontSize: 52, color: theme.text }}>{b}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const ImageCaption: React.FC<{ visual: Visual; durationInFrames: number }> = ({ visual, durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1.08, 1.2], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      {visual.imageUrl && (
        <>
          <Img src={visual.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
          <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.25) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,.88) 100%)" }} />
        </>
      )}
      {visual.caption && (
        <div style={{ position: "absolute", top: 130, left: 80, right: 80 }}>
          <span style={{ fontFamily: sans, fontSize: 38, color: theme.accent2, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>{visual.caption}</span>
        </div>
      )}
      {visual.imageCredit && (
        <div style={{ position: "absolute", bottom: 26, left: 34, fontFamily: sans, fontSize: 20, color: "rgba(255,255,255,.5)" }}>{visual.imageCredit}</div>
      )}
    </AbsoluteFill>
  );
};

export const BigNumber: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #1a1410, ${theme.bg})`, justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{ transform: `scale(${interpolate(e, [0, 1], [0.8, 1])})`, opacity: e, textAlign: "center" }}>
        <div style={{ fontFamily: display, fontSize: 200, fontWeight: 600, color: theme.accent, lineHeight: 1 }}>{visual.value}</div>
        {visual.caption && <p style={{ fontFamily: sans, fontSize: 50, color: theme.text, marginTop: 30, maxWidth: 800 }}>{visual.caption}</p>}
      </div>
    </AbsoluteFill>
  );
};

export const Quote: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter();
  return (
    <AbsoluteFill style={{ background: theme.bg, justifyContent: "center", padding: 100 }}>
      <div style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px)` }}>
        <div style={{ fontFamily: display, fontSize: 180, color: theme.accent, height: 80, lineHeight: 1 }}>“</div>
        <p style={{ fontFamily: display, fontSize: 78, lineHeight: 1.25, color: theme.text, fontStyle: "italic", margin: "0 0 36px" }}>{visual.quote}</p>
        {visual.attribution && <p style={{ fontFamily: sans, fontSize: 42, color: theme.muted }}>— {visual.attribution}</p>}
      </div>
    </AbsoluteFill>
  );
};

export const Outro: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 70%, #1d1d24, ${theme.bg})`, justifyContent: "center", alignItems: "center", padding: 90 }}>
      <div style={{ opacity: e, textAlign: "center" }}>
        <h2 style={{ fontFamily: display, fontSize: 96, color: theme.text, margin: 0 }}>{visual.title ?? "Thanks for watching"}</h2>
        {visual.subtitle && <p style={{ fontFamily: sans, fontSize: 46, color: theme.muted, marginTop: 28 }}>{visual.subtitle}</p>}
        <div style={{ width: 90, height: 6, background: theme.accent, borderRadius: 99, margin: "48px auto 0" }} />
      </div>
    </AbsoluteFill>
  );
};