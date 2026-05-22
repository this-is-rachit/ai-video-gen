// remotion/Root.tsx
import React from "react";
import { Composition } from "remotion";
import { MainVideo, totalFrames } from "./Video";
import { dimensions } from "./theme";
import type { Project } from "@/lib/schema";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={MainVideo as any}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={300}
    defaultProps={{ project: { scenes: [], fps: 30, aspect: "portrait" } as any }}
    calculateMetadata={({ props }) => {
      const project = (props as any).project as Project;
      const dim = dimensions(project.aspect);
      return {
        durationInFrames: Math.max(1, totalFrames(project)),
        fps: project.fps || dim.fps,
        width: dim.width,
        height: dim.height,
      };
    }}
  />
);