// remotion/Root.tsx
import React from "react";
import { Composition } from "remotion";
import { MainVideo, totalFrames } from "./Video";
import { VIDEO } from "./theme";
import type { Project } from "@/lib/schema";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="main"
      component={MainVideo as any}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
      durationInFrames={300}
      defaultProps={{ project: { scenes: [], fps: VIDEO.fps } as any }}
      calculateMetadata={({ props }) => {
        const project = (props as any).project as Project;
        return {
          durationInFrames: Math.max(1, totalFrames(project)),
          fps: project.fps || VIDEO.fps,
          width: VIDEO.width,
          height: VIDEO.height,
        };
      }}
    />
  );
};