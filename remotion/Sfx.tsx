// remotion/Sfx.tsx
import React from "react";
import { Audio, staticFile, Sequence } from "remotion";
import type { Scene } from "@/lib/schema";

const WHOOSH = "sfx/whoosh.mp3";
const DING = "sfx/ding.mp3";

// scenes that deserve an accent "ding" on entrance
const DING_TEMPLATES = new Set(["big_number", "comparison", "title_card"]);

/**
 * Lays SFX at scene boundaries. Errors are swallowed (missing file = silent),
 * so this is safe whether or not /public/sfx files exist.
 */
export const SfxTrack: React.FC<{ scenes: Scene[] }> = ({ scenes }) => {
  let start = 0;
  const cues: React.ReactNode[] = [];
  scenes.forEach((s, i) => {
    const d = Math.max(1, s.durationFrames ?? 1);
    // soft whoosh just before each scene change (skip the very first)
    if (i > 0) {
      cues.push(
        <Sequence key={`w${i}`} from={Math.max(0, start - 4)} durationInFrames={20}>
          <Audio src={staticFile(WHOOSH)} volume={0.25} />
        </Sequence>
      );
    }
    // accent ding on impactful scene types, a few frames in
    if (DING_TEMPLATES.has(s.visual.template)) {
      cues.push(
        <Sequence key={`d${i}`} from={start + 6} durationInFrames={30}>
          <Audio src={staticFile(DING)} volume={0.3} />
        </Sequence>
      );
    }
    start += d;
  });
  return <>{cues}</>;
};