// lib/edit.ts
// Scene-edit engine shared by the deterministic scene editor (Step 8) and the
// chat-to-edit feature (Step 10). It NEVER touches remotion/ — it only mutates
// the PROJECT JSON (narration + renderer-consumed text fields) and, when
// narration changes, re-runs voice + caption alignment for that one scene.
//
// Re-voice is OPTIMISTIC: audioUrl/durationFrames/words are overwritten only
// after a successful synth, so a failed re-voice leaves the scene's existing
// valid timing intact (the preview never breaks).

import { promises as fs } from "fs";
import path from "path";
import { synthesize } from "./falcon";
import { saveSceneAudio, wavDurationSeconds } from "./audio";
import { voiceForLocale } from "./voices";
import { secondsToFrames, VisualSchema, type Project, type Scene, type Visual } from "./schema";
import { ensureSceneWords } from "./captions";
import { alignWithDeepgram } from "./align";
import { estimateChars, recordUsage } from "./usage";

// Only these visual fields may be edited as text. Everything else (template,
// *Query, *Url, *Credit, imageUrls) is preserved from the existing scene so an
// edit can never corrupt media wiring or silently no-op on the renderer.
const EDITABLE_STR = ["title", "subtitle", "value", "caption", "quote", "attribution", "leftLabel", "rightLabel"] as const;

/** Merge incoming text edits onto an existing Visual, keeping template + all
 *  media fields fixed. Returns a schema-validated Visual, or the original if
 *  the merge somehow fails validation (never corrupt the project). */
export function mergeVisualEdit(existing: Visual, incoming: any): Visual {
  if (!incoming || typeof incoming !== "object") return existing;
  const out: any = { ...existing };
  for (const k of EDITABLE_STR) {
    if (typeof incoming[k] === "string") {
      const t = incoming[k].trim();
      if (t) out[k] = t; else delete out[k];
    }
  }
  if (Array.isArray(incoming.bullets)) {
    const b = incoming.bullets.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim());
    if (b.length) out.bullets = b; else delete out.bullets;
  }
  const parsed = VisualSchema.safeParse(out);
  return parsed.success ? parsed.data : existing;
}

/** Re-synthesize + re-align ONE scene (call only when its narration changed).
 *  Spends Murf credits — the caller MUST budget-check first. */
export async function revoiceScene(project: Project, scene: Scene): Promise<void> {
  const lang = project.language || "en-US";
  const voice = voiceForLocale(lang, project.voiceId);

  // Synth first; only mutate timing fields after it succeeds (optimistic).
  const wav = await synthesize(scene.narration, { voiceId: voice, locale: lang });
  await recordUsage(estimateChars(scene.narration));

  scene.audioUrl = await saveSceneAudio(project.id, scene.id, wav);
  scene.durationFrames = secondsToFrames(wavDurationSeconds(wav), project.fps);

  // Re-align captions to the NEW audio (Deepgram, with estimate fallback).
  scene.words = [];
  try {
    if (!process.env.DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY missing");
    const buf = await fs.readFile(path.join(process.cwd(), "public", scene.audioUrl));
    scene.words = await alignWithDeepgram(buf, lang);
    if (!scene.words.length) ensureSceneWords(scene, project.fps);
  } catch {
    ensureSceneWords(scene, project.fps);
  }
}