// remotion/Video.tsx
import React from "react";
import { AbsoluteFill, Audio, Series } from "remotion";
import { Project, Scene } from "@/lib/schema";
import { theme } from "./theme";
import { Captions } from "./Captions";
import { TitleCard, BulletReveal, ImageCaption, BigNumber, Quote, Outro } from "./scenes";

const SceneView: React.FC<{ scene: Scene; durationInFrames: number }> = ({ scene, durationInFrames }) => {
  const v = scene.visual;
  let content: React.ReactNode;
  switch (v.template) {
    case "bullet_reveal": content = <BulletReveal visual={v} />; break;
    case "image_caption": content = <ImageCaption visual={v} durationInFrames={durationInFrames} />; break;
    case "big_number": content = <BigNumber visual={v} />; break;
    case "quote": content = <Quote visual={v} />; break;
    case "outro": content = <Outro visual={v} />; break;
    case "title_card":
    default: content = <TitleCard visual={v} />;
  }
  return (<>{content}<Captions words={scene.words} /></>);
};

export const MainVideo: React.FC<{ project: Project }> = ({ project }) => (
  <AbsoluteFill style={{ backgroundColor: theme.bg }}>
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
  </AbsoluteFill>
);

export const totalFrames = (project: Project) =>
  project.scenes.reduce((a, s) => a + Math.max(1, s.durationFrames ?? 1), 0);