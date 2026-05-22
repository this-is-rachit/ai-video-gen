// remotion/scenes.tsx
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Visual } from "@/lib/schema";
import { useTheme, useStyle, withAlpha, display, sans, hand, springFor } from "./theme";
import { fitTitle, fitBody, fitQuote } from "./text";
import { useLayout } from "./layout";
import { Mascot } from "./Character";

const TEXT_SHADOW = "0 2px 18px rgba(0,0,0,0.55)";

const useEnter = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = useStyle();
  return spring({ frame, fps, config: springFor(s.motion) });
};

const SceneBg: React.FC<{ url?: string | null }> = ({ url }) => {
  const c = useTheme();
  if (!url) return null;
  return (
    <AbsoluteFill>
      <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(6px) brightness(0.55)", transform: "scale(1.12)" }} />
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${withAlpha(c.bg, 0.55)}, ${withAlpha(c.bg, 0.82)})` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 70% at 50% 45%, transparent 0%, ${withAlpha(c.bg, 0.5)} 100%)` }} />
    </AbsoluteFill>
  );
};

/** Soft legibility panel behind copy on photo/video scenes. */
const TextPlate: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const c = useTheme();
  return (
    <div style={{ background: withAlpha(c.bg, 0.42), backdropFilter: "blur(8px)", borderRadius: 22, padding: "22px 28px", border: `1px solid ${withAlpha(c.text, 0.08)}`, ...style }}>
      {children}
    </div>
  );
};

const useSafeBox = (): React.CSSProperties => {
  const { safe } = useLayout();
  return { position: "absolute", left: safe.x, right: safe.x, top: safe.top, bottom: safe.bottom, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" };
};

const Kinetic: React.FC<{ text: string; size: number; color: string }> = ({ text, size, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <h1 style={{ fontFamily: display, fontSize: size, lineHeight: 1.05, color, margin: 0, fontWeight: 600, textShadow: TEXT_SHADOW }}>
      {text.split(" ").map((w, i) => {
        const s = spring({ frame: frame - i * 4, fps, config: { damping: 200 } });
        return <span key={i} style={{ display: "inline-block", marginRight: "0.25em", opacity: s, transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px)` }}>{w}</span>;
      })}
    </h1>
  );
};

export const TitleCard: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter(); const c = useTheme(); const box = useSafeBox(); const { fontScale, landscape } = useLayout();
  return (
    <AbsoluteFill>
      <SceneBg url={visual.bgImageUrl} />
      <div style={{ ...box, alignItems: "center", textAlign: "center" }}>
        {!landscape && <div style={{ opacity: e, marginBottom: 18 }}><Mascot /></div>}
        <Kinetic text={visual.title ?? ""} size={fitTitle(visual.title) * fontScale} color={c.text} />
        {visual.subtitle && <p style={{ fontFamily: sans, fontSize: fitBody(visual.subtitle) * fontScale, color: c.muted, marginTop: 26, opacity: e, textShadow: TEXT_SHADOW }}>{visual.subtitle}</p>}
      </div>
    </AbsoluteFill>
  );
};

export const BulletReveal: React.FC<{ visual: Visual }> = ({ visual }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const c = useTheme(); const box = useSafeBox(); const { fontScale } = useLayout();
  return (
    <AbsoluteFill>
      <SceneBg url={visual.bgImageUrl} />
      <div style={box}>
        {visual.title && <h2 style={{ fontFamily: display, fontSize: fitTitle(visual.title) * 0.7 * fontScale, color: c.text, marginBottom: 44, textShadow: TEXT_SHADOW }}>{visual.title}</h2>}
        {(visual.bullets ?? []).map((b, i) => {
          const s = spring({ frame: frame - i * 9, fps, config: { damping: 200 } });
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 22, marginBottom: 30, opacity: s, transform: `translateX(${interpolate(s, [0, 1], [-50, 0])}px)` }}>
              <div style={{ width: 18, height: 18, borderRadius: 99, background: c.accent, marginTop: 12, flexShrink: 0, boxShadow: `0 0 24px ${c.accent}` }} />
              <span style={{ fontFamily: sans, fontSize: (fitBody(b) + 4) * fontScale, color: c.text, lineHeight: 1.25, textShadow: TEXT_SHADOW }}>{b}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const ImageCaption: React.FC<{ visual: Visual; durationInFrames: number }> = ({ visual, durationInFrames }) => {
  const frame = useCurrentFrame(); const c = useTheme(); const { fontScale } = useLayout();
  const scale = interpolate(frame, [0, durationInFrames], [1.08, 1.22], { extrapolateRight: "clamp" });
  const drift = interpolate(frame, [0, durationInFrames], [-20, 20], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      {visual.imageUrl ? (
        <>
          <Img src={visual.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translateY(${drift}px)` }} />
          <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.55) 0%, rgba(0,0,0,.12) 30%, rgba(0,0,0,.15) 62%, rgba(0,0,0,.85) 100%)" }} />
        </>
      ) : <SceneBg url={visual.bgImageUrl} />}
      {visual.caption && (
        <div style={{ position: "absolute", top: "11%", left: "7%", right: "7%" }}>
          <TextPlate style={{ display: "inline-block", padding: "14px 22px" }}>
            <span style={{ fontFamily: sans, fontSize: 40 * fontScale, color: c.accent2, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", textShadow: TEXT_SHADOW }}>{visual.caption}</span>
          </TextPlate>
        </div>
      )}
      {visual.imageCredit && <Credit text={visual.imageCredit} />}
    </AbsoluteFill>
  );
};

export const BRoll: React.FC<{ visual: Visual }> = ({ visual }) => {
  const c = useTheme(); const { fontScale } = useLayout();
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      {visual.bRollUrl ? (
        <>
          <OffthreadVideo src={visual.bRollUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.5) 0%, rgba(0,0,0,.1) 32%, rgba(0,0,0,.15) 60%, rgba(0,0,0,.85) 100%)" }} />
        </>
      ) : <SceneBg url={visual.bgImageUrl} />}
      {visual.caption && (
        <div style={{ position: "absolute", top: "11%", left: "7%", right: "7%" }}>
          <TextPlate style={{ display: "inline-block", padding: "14px 22px" }}>
            <span style={{ fontFamily: sans, fontSize: 40 * fontScale, color: c.accent2, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", textShadow: TEXT_SHADOW }}>{visual.caption}</span>
          </TextPlate>
        </div>
      )}
      {visual.bRollCredit && <Credit text={visual.bRollCredit} />}
    </AbsoluteFill>
  );
};

export const BigNumber: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter(); const c = useTheme(); const box = useSafeBox(); const { fontScale } = useLayout();
  return (
    <AbsoluteFill>
      <SceneBg url={visual.bgImageUrl} />
      <div style={{ ...box, alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: display, fontSize: Math.min(220, fitTitle(visual.value) * 1.7) * fontScale, fontWeight: 600, color: c.accent, lineHeight: 1, transform: `scale(${interpolate(e, [0, 1], [0.78, 1])})`, opacity: e, textShadow: `0 0 80px ${c.accent}55, ${TEXT_SHADOW}` }}>
          {visual.value}
        </div>
        {visual.caption && <p style={{ fontFamily: sans, fontSize: (fitBody(visual.caption) + 6) * fontScale, color: c.text, marginTop: 26, opacity: e, textShadow: TEXT_SHADOW }}>{visual.caption}</p>}
      </div>
    </AbsoluteFill>
  );
};

export const Quote: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter(); const c = useTheme(); const box = useSafeBox(); const { fontScale } = useLayout();
  return (
    <AbsoluteFill>
      <SceneBg url={visual.bgImageUrl} />
      <div style={box}>
        <div style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px)` }}>
          <div style={{ fontFamily: display, fontSize: 170 * fontScale, color: c.accent, height: 80 * fontScale, lineHeight: 1, textShadow: TEXT_SHADOW }}>“</div>
          <p style={{ fontFamily: display, fontSize: fitQuote(visual.quote) * fontScale, lineHeight: 1.25, color: c.text, fontStyle: "italic", margin: "0 0 28px", textShadow: TEXT_SHADOW }}>{visual.quote}</p>
          {visual.attribution && <p style={{ fontFamily: sans, fontSize: 40 * fontScale, color: c.muted, textShadow: TEXT_SHADOW }}>— {visual.attribution}</p>}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Whiteboard: React.FC<{ visual: Visual }> = ({ visual }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const c = useTheme(); const { fontScale, w } = useLayout();
  const dash = (from: number, to: number, len: number) => len * (1 - interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill style={{ background: "#F4EEE0", padding: "9%", justifyContent: "center" }}>
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(#0000000a 1px,transparent 1px),linear-gradient(90deg,#0000000a 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <h2 style={{ fontFamily: hand, fontSize: Math.min(120, fitTitle(visual.title) * 1.0) * fontScale, color: "#1b1b1b", margin: 0, lineHeight: 1.05 }}>{visual.title}</h2>
      <svg width={Math.min(820, w * 0.7)} height="60" style={{ marginTop: 4 }}>
        <path d="M10 26 C 230 8, 560 44, 800 22" stroke={c.accent} strokeWidth="11" fill="none" strokeLinecap="round" strokeDasharray={830} strokeDashoffset={dash(6, 40, 830)} />
        <path d="M770 14 l 30 8 l -26 16" stroke={c.accent} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={90} strokeDashoffset={dash(34, 50, 90)} />
      </svg>
      {(visual.bullets ?? []).map((b, i) => {
        const s = spring({ frame: frame - 50 - i * 22, fps, config: { damping: 200 } });
        return (
          <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", fontFamily: hand, fontSize: 60 * fontScale, color: "#2a2a2a", marginTop: 28, opacity: s, transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)` }}>
            <span style={{ color: c.accent }}>✓</span><span>{b}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Outro: React.FC<{ visual: Visual }> = ({ visual }) => {
  const e = useEnter(); const c = useTheme(); const box = useSafeBox(); const { fontScale, landscape } = useLayout();
  return (
    <AbsoluteFill>
      <SceneBg url={visual.bgImageUrl} />
      <div style={{ ...box, alignItems: "center", textAlign: "center" }}>
        {!landscape && <div style={{ opacity: e, marginBottom: 22 }}><Mascot size={150} /></div>}
        <h2 style={{ fontFamily: display, fontSize: fitTitle(visual.title) * 0.85 * fontScale, color: c.text, margin: 0, textShadow: TEXT_SHADOW }}>{visual.title ?? "Thanks for watching"}</h2>
        {visual.subtitle && <p style={{ fontFamily: sans, fontSize: fitBody(visual.subtitle) * fontScale, color: c.muted, marginTop: 22, textShadow: TEXT_SHADOW }}>{visual.subtitle}</p>}
        <div style={{ width: 90, height: 6, background: c.accent, borderRadius: 99, marginTop: 36 }} />
      </div>
    </AbsoluteFill>
  );
};

// ---- NEW: montage burst (3-5 images, beat-timed) ----
export const Montage: React.FC<{ visual: Visual; durationInFrames: number }> = ({ visual, durationInFrames }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const c = useTheme(); const { fontScale } = useLayout();
  const urls = ((visual as any).imageUrls ?? []).slice(0, 5) as string[];
  if (!urls.length) return <SceneBg url={visual.bgImageUrl} />;
  const per = durationInFrames / urls.length;
  const idx = Math.min(urls.length - 1, Math.floor(frame / per));
  const local = frame - idx * per;
  const inAnim = spring({ frame: local, fps, config: { damping: 40, stiffness: 160 } });
  const zoom = interpolate(local, [0, per], [1.06, 1.16], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      <AbsoluteFill style={{ opacity: inAnim }}>
        <Img src={urls[idx]} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.5) 0%, rgba(0,0,0,.05) 35%, rgba(0,0,0,.7) 100%)" }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: "16%", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12 }}>
        {urls.map((_, i) => (
          <div key={i} style={{ width: i === idx ? 34 : 14, height: 6, borderRadius: 99, background: i === idx ? c.accent : withAlpha(c.text, 0.4) }} />
        ))}
      </div>
      {visual.caption && (
        <div style={{ position: "absolute", top: "11%", left: "7%", right: "7%" }}>
          <TextPlate style={{ display: "inline-block", padding: "14px 22px" }}>
            <span style={{ fontFamily: sans, fontSize: 40 * fontScale, color: c.accent2, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", textShadow: TEXT_SHADOW }}>{visual.caption}</span>
          </TextPlate>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---- NEW: split-screen comparison (X vs Y) ----
export const Comparison: React.FC<{ visual: Visual }> = ({ visual }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const c = useTheme(); const { fontScale, landscape } = useLayout();
  const v: any = visual;
  const sL = spring({ frame, fps, config: { damping: 60, stiffness: 120 } });
  const sR = spring({ frame: frame - 6, fps, config: { damping: 60, stiffness: 120 } });
  const Half: React.FC<{ url?: string | null; label?: string; anim: number; from: number; tint: string }> = ({ url, label, anim, from, tint }) => (
    <div style={{ flex: 1, position: "relative", overflow: "hidden", transform: landscape ? `translateX(${interpolate(anim, [0, 1], [from, 0])}px)` : `translateY(${interpolate(anim, [0, 1], [from, 0])}px)`, opacity: anim }}>
      {url ? <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <AbsoluteFill style={{ background: tint }} />}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.2), rgba(0,0,0,.75))" }} />
      {label && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "8%", textAlign: "center" }}>
          <span style={{ fontFamily: display, fontSize: 64 * fontScale, fontWeight: 700, color: "#fff", textShadow: TEXT_SHADOW }}>{label}</span>
        </div>
      )}
    </div>
  );
  return (
    <AbsoluteFill style={{ background: c.bg, display: "flex", flexDirection: landscape ? "row" : "column" }}>
      <Half url={v.leftImageUrl} label={v.leftLabel} anim={sL} from={-120} tint={withAlpha(c.accent, 0.5)} />
      <Half url={v.rightImageUrl} label={v.rightLabel} anim={sR} from={120} tint={withAlpha(c.accent2, 0.5)} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 86, height: 86, borderRadius: 99, background: c.bg, border: `3px solid ${c.accent}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: spring({ frame: frame - 12, fps, config: { damping: 12 } }) }}>
        <span style={{ fontFamily: display, fontWeight: 800, fontSize: 34, color: c.text }}>VS</span>
      </div>
    </AbsoluteFill>
  );
};

const Credit: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", bottom: 26, left: 34, fontFamily: sans, fontSize: 20, color: "rgba(255,255,255,.5)", textShadow: "0 1px 6px rgba(0,0,0,.6)" }}>{text}</div>
);