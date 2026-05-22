// lib/schema.ts
import { z } from "zod";

export const TEMPLATES = [
  "title_card", "bullet_reveal", "image_caption", "big_number", "quote", "outro",
] as const;

// Flat, optional fields — each template reads what it needs.
export const VisualSchema = z.object({
  template: z.enum(TEMPLATES),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  imageQuery: z.string().optional(),   // for image_caption / backgrounds
  imageUrl: z.string().nullable().optional(),    // resolved Pexels URL (cache)
  imageCredit: z.string().nullable().optional(),
  value: z.string().optional(),        // for big_number, e.g. "13.8 billion years"
  caption: z.string().optional(),
  quote: z.string().optional(),
  attribution: z.string().optional(),
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