// remotion/Video.tsx
import React from "react";
import { AbsoluteFill, Audio, interpolate, Series, useCurrentFrame } from "remotion";
import { Project, Scene } from "@/lib/schema";
import { ThemeContext, themeFor } from "./theme";
import { Captions } from "./Captions";
import { AnimatedBackground, Grain, Vignette, Progress } from "./Background";
import { TitleCard, BulletReveal, ImageCaption, BRoll, BigNumber, Quote, Whiteboard, Outro } from "./scenes";

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

export const MainVideo: React.FC<{ project: Project }> = ({ project }) => {
  const palette = themeFor(project.topic);
  return (
    <ThemeContext.Provider value={palette}>
      <AbsoluteFill style={{ backgroundColor: palette.bg }}>
        <AnimatedBackground />
        <Series>
          {project.scenes.map((scene) => {
            const d = Math.max(1, scene.durationFrames ?? 1);
            return (
              <Series.Sequence key={scene.id} durationInFrames={d}>
                <SceneView scene={scene} durationInFrames={d} />
                {scene.audioUrl && <Audio src={scene.audioUrl} />}
              </Series.Sequence>
            );
          })}
        </Series>
        {project.musicUrl && <Audio src={project.musicUrl} volume={0.11} loop />}
        <Grain />
        <Vignette />
        <Progress total={totalFrames(project)} />
      </AbsoluteFill>
    </ThemeContext.Provider>
  );
};