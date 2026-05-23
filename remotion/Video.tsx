// remotion/Video.tsx
import React from "react";
import { SfxTrack } from "./Sfx";
import { AbsoluteFill, Audio, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import { Project, Scene } from "@/lib/schema";
import { ThemeContext, themeFor, StyleContext, packFor, LangContext } from "./theme";
import { Captions } from "./Captions";
import { AnimatedBackground, Grain, Vignette, Progress } from "./Background";
import { TitleCard, BulletReveal, ImageCaption, BRoll, BigNumber, Quote, Whiteboard, Outro, Montage, Comparison } from "./scenes";

// Resolve a stored asset URL for both Player + render.
// "/cache/.." or "/audio/.." → staticFile; remote/blob/data left untouched.
export function assetSrc(u?: string | null): string {
  if (!u) return "";
  if (/^(https?:|blob:|data:|file:)/i.test(u)) return u;
  return staticFile(u.replace(/^\//, ""));
}

// ---- music mix (ducking) ----
const MUSIC_BASE = 0.12;
const MUSIC_SWELL = 0.3;
const EDGE = 12;

const SceneInner: React.FC<{ scene: Scene; durationInFrames: number }> = ({ scene, durationInFrames }) => {
  const v = scene.visual;
  switch (v.template) {
    case "bullet_reveal": return <BulletReveal visual={v} />;
    case "image_caption": return <ImageCaption visual={v} durationInFrames={durationInFrames} />;
    case "b_roll": return <BRoll visual={v} />;
    case "big_number": return <BigNumber visual={v} />;
    case "quote": return <Quote visual={v} />;
    case "whiteboard": return <Whiteboard visual={v} />;
    case "outro": return <Outro visual={v} />;
    case "montage": return <Montage visual={v} durationInFrames={durationInFrames} />;
    case "comparison": return <Comparison visual={v} />;
    case "title_card":
    default: return <TitleCard visual={v} />;
  }
};

const SceneView: React.FC<{ scene: Scene; durationInFrames: number }> = ({ scene, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      <SceneInner scene={scene} durationInFrames={durationInFrames} />
      <Captions words={scene.words} />
    </AbsoluteFill>
  );
};

export const totalFrames = (project: Project) =>
  project.scenes.reduce((a, s) => a + Math.max(1, s.durationFrames ?? 1), 0);

function voiceWindow(project: Project, total: number) {
  const scenes = project.scenes;
  if (!scenes.length) return { firstVoice: 0, lastVoice: total };
  const fps = project.fps || 30;
  const w0 = scenes[0].words?.[0];
  const firstVoice = Math.round((w0 ? w0.start : 0) * fps);
  let start = 0, lastVoice = total;
  for (let i = 0; i < scenes.length; i++) {
    const d = Math.max(1, scenes[i].durationFrames ?? 1);
    if (i === scenes.length - 1) {
      const ws = scenes[i].words;
      const lastSec = ws && ws.length ? ws[ws.length - 1].end : d / fps;
      lastVoice = start + Math.round(lastSec * fps);
    }
    start += d;
  }
  return { firstVoice, lastVoice };
}

const Music: React.FC<{ src: string; total: number; firstVoice: number; lastVoice: number }> = ({ src, total, firstVoice, lastVoice }) => {
  const volume = (f: number) => {
    let v = MUSIC_BASE;
    if (f < firstVoice) v = interpolate(f, [0, Math.max(1, firstVoice)], [MUSIC_SWELL, MUSIC_BASE], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    else if (f > lastVoice) v = interpolate(f, [lastVoice, total], [MUSIC_BASE, MUSIC_SWELL], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const edge = interpolate(f, [0, EDGE, total - EDGE, total], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return Math.max(0, v * edge);
  };
  return <Audio src={assetSrc(src)} volume={volume} loop />;
};

export const MainVideo: React.FC<{ project: Project }> = ({ project }) => {
  const palette = themeFor(project.topic);
  const pack = packFor(project.topic, (project as any).stylePack);
  const total = totalFrames(project);
  const { firstVoice, lastVoice } = voiceWindow(project, total);
  return (
    <ThemeContext.Provider value={palette}>
      <StyleContext.Provider value={pack}>
      <LangContext.Provider value={project.language || "en-US"}>
      <AbsoluteFill style={{ backgroundColor: palette.bg }}>
        <AnimatedBackground />
        <Series>
          {project.scenes.map((scene) => {
            const d = Math.max(1, scene.durationFrames ?? 1);
            return (
              <Series.Sequence key={scene.id} durationInFrames={d}>
                <SceneView scene={scene} durationInFrames={d} />
                {scene.audioUrl && <Audio src={assetSrc(scene.audioUrl)} />}
              </Series.Sequence>
            );
          })}
        </Series>
        {project.musicUrl && <Music src={project.musicUrl} total={total} firstVoice={firstVoice} lastVoice={lastVoice} />}
        <SfxTrack scenes={project.scenes} />
        <Grain />
        <Vignette />
        <Progress total={total} />
      </AbsoluteFill>
    </LangContext.Provider>
    </StyleContext.Provider>
    </ThemeContext.Provider>
  );
};