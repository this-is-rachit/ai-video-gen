// remotion/scenes.tsx
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Visual } from "@/lib/schema";
import { useTheme, withAlpha, display, sans, hand } from "./theme";
import { SAFE, fitTitle, fitBody, fitQuote } from "./text";
import { Mascot } from "./Character";

const useEnter = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, config: { damping: 200 } });
};

// dim, blurred matching photo behind text scenes
const SceneBg: React.FC<{ url?: string | null }> = ({ url }) => {
  const c = useTheme();
  if (!url) return null;
  return (
    <AbsoluteFill>
      <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(7px) brightness(0.42)", transform: "scale(1.12)" }} />
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${withAlpha(c.bg, 0.78)}, ${withAlpha(c.bg, 0.92)})` }} />
    </AbsoluteFill>
  );
};

const safeBox: React.CSSProperties = {
  position: "absolute", left: SAFE.x, right: SAFE.x, top: SAFE.top, bottom: SAFE.bottom,
  display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden",
};

const Kinetic: React.FC<{ text: string; size: number; color: string }> = ({ text, size, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <h1 style={{ fontFamily: display, fontSize: size, lineHeight: 1.05, color, margin: 0, fontWeight: 600 }}>
      {text.split(" ").map((w, i) => {
        const s = spring({ frame: frame - i * 4, fps, config: { damping: 200 } });
        return <span key={i} style={{ display: "inline-block", marginRight: "0.25em", opacity: s, transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px)` }}>{w}</span>;
      })}
    </h1>
  );
};

export const TitleCard: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter(); const c = useTheme();
  return (
    <AbsoluteFill>
      <SceneBg url={visual.bgImageUrl} />
      <div style={{ ...safeBox, alignItems: "center", textAlign: "center" }}>
        <div style={{ opacity: e, marginBottom: 18 }}><Mascot /></div>
        <Kinetic text={visual.title ?? ""} size={fitTitle(visual.title)} color={c.text} />
        {visual.subtitle && <p style={{ fontFamily: sans, fontSize: fitBody(visual.subtitle), color: c.muted, marginTop: 28, opacity: e }}>{visual.subtitle}</p>}
      </div>
    </AbsoluteFill>
  );
};

export const BulletReveal: React.FC<{ visual: Visual }> = ({ visual }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const c = useTheme();
  return (
    <AbsoluteFill>
      <SceneBg url={visual.bgImageUrl} />
      <div style={safeBox}>
        {visual.title && <h2 style={{ fontFamily: display, fontSize: fitTitle(visual.title) * 0.7, color: c.text, marginBottom: 48 }}>{visual.title}</h2>}
        {(visual.bullets ?? []).map((b, i) => {
          const s = spring({ frame: frame - i * 9, fps, config: { damping: 200 } });
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 34, opacity: s, transform: `translateX(${interpolate(s, [0, 1], [-50, 0])}px)` }}>
              <div style={{ width: 18, height: 18, borderRadius: 99, background: c.accent, marginTop: 14, flexShrink: 0, boxShadow: `0 0 24px ${c.accent}` }} />
              <span style={{ fontFamily: sans, fontSize: fitBody(b) + 4, color: c.text, lineHeight: 1.25 }}>{b}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const ImageCaption: React.FC<{ visual: Visual; durationInFrames: number }> = ({ visual, durationInFrames }) => {
  const frame = useCurrentFrame(); const c = useTheme();
  const scale = interpolate(frame, [0, durationInFrames], [1.08, 1.22], { extrapolateRight: "clamp" });
  const drift = interpolate(frame, [0, durationInFrames], [-20, 20], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      {visual.imageUrl ? (
        <>
          <Img src={visual.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translateY(${drift}px)` }} />
          <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.3) 0%, rgba(0,0,0,0) 36%, rgba(0,0,0,.9) 100%)" }} />
        </>
      ) : <SceneBg url={visual.bgImageUrl} />}
      {visual.caption && (
        <div style={{ position: "absolute", top: 130, left: 80, right: 80 }}>
          <span style={{ fontFamily: sans, fontSize: 40, color: c.accent2, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>{visual.caption}</span>
        </div>
      )}
      {visual.imageCredit && <Credit text={visual.imageCredit} />}
    </AbsoluteFill>
  );
};

export const BRoll: React.FC<{ visual: Visual }> = ({ visual }) => {
  const c = useTheme();
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      {visual.bRollUrl ? (
        <>
          <OffthreadVideo src={visual.bRollUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.25) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,.9) 100%)" }} />
        </>
      ) : <SceneBg url={visual.bgImageUrl} />}
      {visual.caption && (
        <div style={{ position: "absolute", top: 130, left: 80, right: 80 }}>
          <span style={{ fontFamily: sans, fontSize: 40, color: c.accent2, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>{visual.caption}</span>
        </div>
      )}
      {visual.bRollCredit && <Credit text={visual.bRollCredit} />}
    </AbsoluteFill>
  );
};

export const BigNumber: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter(); const c = useTheme();
  return (
    <AbsoluteFill>
      <SceneBg url={visual.bgImageUrl} />
      <div style={{ ...safeBox, alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: display, fontSize: Math.min(220, fitTitle(visual.value) * 1.7), fontWeight: 600, color: c.accent, lineHeight: 1, transform: `scale(${interpolate(e, [0, 1], [0.78, 1])})`, opacity: e, textShadow: `0 0 80px ${c.accent}55` }}>
          {visual.value}
        </div>
        {visual.caption && <p style={{ fontFamily: sans, fontSize: fitBody(visual.caption) + 6, color: c.text, marginTop: 28, opacity: e }}>{visual.caption}</p>}
      </div>
    </AbsoluteFill>
  );
};

export const Quote: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter(); const c = useTheme();
  return (
    <AbsoluteFill>
      <SceneBg url={visual.bgImageUrl} />
      <div style={{ ...safeBox }}>
        <div style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px)` }}>
          <div style={{ fontFamily: display, fontSize: 180, color: c.accent, height: 80, lineHeight: 1 }}>“</div>
          <p style={{ fontFamily: display, fontSize: fitQuote(visual.quote), lineHeight: 1.25, color: c.text, fontStyle: "italic", margin: "0 0 30px" }}>{visual.quote}</p>
          {visual.attribution && <p style={{ fontFamily: sans, fontSize: 40, color: c.muted }}>— {visual.attribution}</p>}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Whiteboard: React.FC<{ visual: Visual }> = ({ visual }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const c = useTheme();
  const dash = (from: number, to: number, len: number) => len * (1 - interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill style={{ background: "#F4EEE0", padding: 96, justifyContent: "center" }}>
      {/* faint paper grid */}
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(#0000000a 1px,transparent 1px),linear-gradient(90deg,#0000000a 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <h2 style={{ fontFamily: hand, fontSize: Math.min(120, fitTitle(visual.title) * 1.0), color: "#1b1b1b", margin: 0, lineHeight: 1.05 }}>{visual.title}</h2>
      <svg width="820" height="60" style={{ marginTop: 4 }}>
        <path d="M10 26 C 230 8, 560 44, 800 22" stroke={c.accent} strokeWidth="11" fill="none" strokeLinecap="round" strokeDasharray={830} strokeDashoffset={dash(6, 40, 830)} />
        <path d="M770 14 l 30 8 l -26 16" stroke={c.accent} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={90} strokeDashoffset={dash(34, 50, 90)} />
      </svg>
      {(visual.bullets ?? []).map((b, i) => {
        const s = spring({ frame: frame - 50 - i * 22, fps, config: { damping: 200 } });
        return (
          <div key={i} style={{ display: "flex", gap: 18, alignItems: "flex-start", fontFamily: hand, fontSize: 62, color: "#2a2a2a", marginTop: 34, opacity: s, transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)` }}>
            <span style={{ color: c.accent }}>✓</span><span>{b}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Outro: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter(); const c = useTheme();
  return (
    <AbsoluteFill>
      <SceneBg url={visual.bgImageUrl} />
      <div style={{ ...safeBox, alignItems: "center", textAlign: "center" }}>
        <div style={{ opacity: e, marginBottom: 24 }}><Mascot size={150} /></div>
        <h2 style={{ fontFamily: display, fontSize: fitTitle(visual.title) * 0.85, color: c.text, margin: 0 }}>{visual.title ?? "Thanks for watching"}</h2>
        {visual.subtitle && <p style={{ fontFamily: sans, fontSize: fitBody(visual.subtitle), color: c.muted, marginTop: 24 }}>{visual.subtitle}</p>}
        <div style={{ width: 90, height: 6, background: c.accent, borderRadius: 99, marginTop: 40 }} />
      </div>
    </AbsoluteFill>
  );
};

const Credit: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", bottom: 26, left: 34, fontFamily: sans, fontSize: 20, color: "rgba(255,255,255,.5)" }}>{text}</div>
);