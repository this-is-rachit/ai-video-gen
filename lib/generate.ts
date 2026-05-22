// lib/generate.ts
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { getModel, type Provider } from "./llm";
import { SceneDraftSchema } from "./schema";

export interface GenInput {
  topic: string;
  language: string;     // locale code, e.g. "en-US", "hi-IN"
  provider: Provider;
  apiKey: string;
  model?: string;
}

/** Step 1: gather concrete, accurate facts. */
export async function researchTopic(input: GenInput): Promise<string> {
  const { text } = await generateText({
    model: getModel(input.provider, input.apiKey, input.model),
    prompt:
`You are a meticulous researcher. Topic: "${input.topic}".
List 8-12 accurate, concrete, genuinely interesting facts a 2-minute explainer should cover.
Prefer specifics: numbers, names, causes and effects. No fluff, no repetition.
Output plain bullet points only.`,
  });
  return text;
}

const ScriptSchema = z.object({
  scenes: z.array(SceneDraftSchema).min(8).max(16),
});

/** Step 2: turn facts into a validated scenes array. */
export async function writeScript(input: GenInput, facts: string) {
  const { object } = await generateObject({
    model: getModel(input.provider, input.apiKey, input.model),
    schema: ScriptSchema,
    prompt:
`Write a punchy, accurate 2-minute narrated explainer video script about "${input.topic}".

Use ONLY these researched facts:
${facts}

RULES (follow exactly):
- Write all narration in the language for locale "${input.language}".
- 10 to 14 scenes. Each narration = ONE or TWO short spoken sentences.
- TOTAL narration ~280-340 words (about a 2-minute read). Do NOT exceed 340.
- Each scene needs visual.template, one of: title_card, bullet_reveal, image_caption, big_number, quote, outro.
- Scene 1 MUST be title_card (set title + a short subtitle). Last scene MUST be outro (a closing line).
- image_caption: set imageQuery to 2-4 vivid keywords IN ENGLISH (stock-photo search works best in English), and a short caption in the target language.
- bullet_reveal: set bullets (2-4 short items). big_number: set value + caption. quote: set quote + attribution.
- Keep momentum: hook first, payoff last. Accurate and self-contained.`,
  });
  return object.scenes;
}