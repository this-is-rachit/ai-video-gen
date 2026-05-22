// lib/schema.ts
import { z } from "zod";

export const TEMPLATES = [
  "title_card", "bullet_reveal", "image_caption", "b_roll",
  "big_number", "quote", "whiteboard", "outro",
] as const;

export const VisualSchema = z.object({
  template: z.enum(TEMPLATES),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  value: z.string().optional(),
  caption: z.string().optional(),
  quote: z.string().optional(),
  attribution: z.string().optional(),
  // images (image_caption)
  imageQuery: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  imageCredit: z.string().nullable().optional(),
  bgImageQuery: z.string().optional(),
  bgImageUrl: z.string().nullable().optional(),
  // stock video b-roll (b_roll)
  bRollQuery: z.string().optional(),
  bRollUrl: z.string().nullable().optional(),
  bRollCredit: z.string().nullable().optional(),
});

export const WordSchema = z.object({
  text: z.string(),
  start: z.number(), // seconds (from the aligner in Phase 5)
  end: z.number(),
});

// What the LLM returns per scene in Phase 3
export const SceneDraftSchema = z.object({
  narration: z.string(),
  visual: VisualSchema,
});

// Full stored scene — audio/timing/words get filled in later phases
export const SceneSchema = SceneDraftSchema.extend({
  id: z.string(),
  audioUrl: z.string().nullable().default(null),
  durationFrames: z.number().nullable().default(null),
  words: z.array(WordSchema).default([]),
});

export const STATUSES = [
  "draft", "scripting", "voicing", "aligning", "rendering", "done", "error",
] as const;

export const ProjectSchema = z.object({
  id: z.string(),
  topic: z.string(),
  language: z.string().default("en-US"),
  voiceId: z.string().default("Matthew"),
  style: z.string().default("explainer"),
  fps: z.number().default(30),
  status: z.enum(STATUSES).default("draft"),
  scenes: z.array(SceneSchema).default([]),
  videoUrl: z.string().nullable().default(null),
  musicUrl: z.string().nullable().optional(),
  musicCredit: z.string().nullable().optional(),
  musicMood: z.string().nullable().optional(),
  aspect: z.enum(["portrait", "landscape"]).default("portrait"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Types derived from the schemas (never write these by hand)
export type Visual = z.infer<typeof VisualSchema>;
export type Word = z.infer<typeof WordSchema>;
export type SceneDraft = z.infer<typeof SceneDraftSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Project = z.infer<typeof ProjectSchema>;

export function secondsToFrames(seconds: number, fps = 30): number {
  return Math.round(seconds * fps);
}