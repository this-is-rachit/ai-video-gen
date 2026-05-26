// lib/generate.ts
import { generateText } from "ai";
import { getModel, type Provider } from "./llm";
import { SceneDraftSchema, TEMPLATES, type SceneDraft } from "./schema";
import { languageName } from "./voices";
export interface GenInput {
  topic: string;
  language: string;
  provider: Provider;
  apiKey: string;
  model?: string;
  targetSeconds?: number | null; // desired video length; drives script size (default ~120s)
}

/**
 * Derive a script "budget" from the requested duration. The renderer's length
 * is emergent (sum of per-scene TTS), so a LONGER video = MORE short scenes,
 * never longer narration per scene. Speech ≈ 2.5 words/sec (~150 wpm), one
 * beat per ~11s. Clamped to 30s..300s (the 5-minute ceiling).
 */
export interface ScriptBudget {
  secs: number; label: string;
  minWords: number; maxWords: number;
  minScenes: number; maxScenes: number;
  minFacts: number; maxFacts: number;
  repeatCap: number;
}
export function scriptBudget(targetSeconds?: number | null): ScriptBudget {
  const secs = Math.max(30, Math.min(300, Math.round(Number(targetSeconds) || 120)));
  const centerWords = Math.round(secs * 2.5);
  const minWords = Math.round(centerWords * 0.9);
  const maxWords = Math.round(centerWords * 1.05);
  const centerScenes = Math.max(5, Math.round(secs / 11));
  const minScenes = Math.max(5, centerScenes - 2);
  const maxScenes = centerScenes + 3;
  const minFacts = Math.max(8, Math.round(maxScenes * 0.8));
  const maxFacts = Math.min(40, Math.round(maxScenes * 1.2));
  const repeatCap = Math.max(3, Math.round(maxScenes / 4));
  const m = secs / 60;
  const label = Number.isInteger(m) ? `${m}-minute` : `${m.toFixed(1)}-minute`;
  return { secs, label, minWords, maxWords, minScenes, maxScenes, minFacts, maxFacts, repeatCap };
}

/** Step 1: gather concrete, accurate facts. */
export async function researchTopic(input: GenInput): Promise<string> {
  const b = scriptBudget(input.targetSeconds);
  const { text } = await generateText({
    model: getModel(input.provider, input.apiKey, input.model),
    prompt:
`You are a meticulous researcher. Topic: "${input.topic}".
List ${b.minFacts}-${b.maxFacts} accurate, concrete, genuinely interesting facts a ${b.label} explainer should cover.
Prefer specifics: numbers, names, causes and effects. No fluff, no repetition.
Output plain bullet points only.`,
  });
  return text;
}
/** Pull a JSON object out of a model reply, tolerating code fences / preamble. */
function extractJson(text: string): any {
  let t = (text || "").trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}
const STRING_FIELDS = ["title", "subtitle", "value", "caption", "quote", "attribution", "imageQuery", "bRollQuery", "bgImageQuery"];
/** Coerce one raw scene into a valid SceneDraft, or null if unusable. */
function normalizeScene(raw: any): SceneDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const narration = typeof raw.narration === "string" ? raw.narration.trim() : "";
  if (!narration) return null;
  const v = raw.visual && typeof raw.visual === "object" ? raw.visual : {};
  let template = typeof v.template === "string" ? v.template : "image_caption";
  if (!(TEMPLATES as readonly string[]).includes(template)) template = "image_caption";
  const visual: any = { template };
  for (const k of STRING_FIELDS) {
    if (typeof v[k] === "string" && v[k].trim()) visual[k] = v[k].trim();
  }
  if (Array.isArray(v.bullets)) {
    visual.bullets = v.bullets.filter((b: any) => typeof b === "string" && b.trim()).map((b: string) => b.trim());
  }
  if (Array.isArray(v.images)) {
    visual.images = v.images.filter((b: any) => typeof b === "string" && b.trim()).map((b: string) => b.trim()).slice(0, 5);
  }
  for (const k of ["leftLabel", "rightLabel", "leftImageQuery", "rightImageQuery"]) {
    if (typeof v[k] === "string" && v[k].trim()) visual[k] = v[k].trim();
  }
  const parsed = SceneDraftSchema.safeParse({ narration, visual });
  return parsed.success ? parsed.data : null;
}
/** Step 2: ask for JSON text, parse + repair + validate ourselves (provider-agnostic). */
export async function writeScript(input: GenInput, facts: string): Promise<{ scenes: SceneDraft[]; stylePack: string | null }> {
  const b = scriptBudget(input.targetSeconds);
  const prompt =
`Write a punchy, accurate ${b.label} narrated explainer video script about "${input.topic}".
Use ONLY these researched facts:
${facts}
Return ONLY a JSON object (no markdown, no commentary) of this exact shape:
{"stylePack":"...","scenes":[{"narration":"...","visual":{"template":"...", ...fields}}]}
- "stylePack" = the visual style best fitting this topic, ONE of: editorial, boldpop, cinematic, tech, retro, minimal.
  (editorial=serious/finance/science, boldpop=fun listicles, cinematic=history/space/nature, tech=technology, retro=culture/music/games, minimal=clean default)
RULES:
- LANGUAGE: Write ALL narration AND all on-screen text fields (title, subtitle, bullets, caption, value, quote, attribution, leftLabel, rightLabel) entirely in ${languageName(input.language)}. Do NOT use English unless the chosen language is English. Use the correct native script throughout.
- DO NOT TRANSLATE the search-query fields: "imageQuery", "bRollQuery", "bgImageQuery", "leftImageQuery", "rightImageQuery" and the "images" array MUST stay in plain ENGLISH keywords (these query an English stock-photo service). Everything the viewer reads/hears = ${languageName(input.language)}; everything used to search images = English.
- ${b.minScenes}-${b.maxScenes} scenes. Each narration = ONE or TWO short spoken sentences. TOTAL ~${b.minWords}-${b.maxWords} words across the whole script. To make a longer video, use MORE scenes — never longer narration in a single scene.
- visual.template is one of: ${TEMPLATES.join(", ")}. Vary them; don't repeat any one template more than ~${b.repeatCap} times.
- KEEP TEXT SHORT so it fits the screen: title <= 6 words, subtitle <= 10 words, each bullet <= 8 words, caption <= 6 words, value <= 4 words (e.g. "13.8B years"), quote <= 25 words.
- Scene 1 = title_card. Last scene = outro.
- image_caption: set "imageQuery" = 2-4 vivid ENGLISH keywords (unique subject per scene).
- b_roll: set "bRollQuery" = 2-4 ENGLISH keywords for MOVING footage. Use 2-3 b_roll scenes.
- montage (use 0-1 times, for "examples/variety" beats): set "images" = array of 3-5 short ENGLISH image queries, each a different subject.
- comparison (use ONLY when the scene contrasts two things, 0-1 times): set "leftLabel","rightLabel" (<=3 words each) and "leftImageQuery","rightImageQuery" (2-3 ENGLISH keywords each).
- EVERY scene that is NOT image_caption, b_roll, or whiteboard MUST also set "bgImageQuery" = 2-4 unique ENGLISH keywords matching that scene.
- whiteboard: "title" + "bullets" (2-4). big_number: "value" + "caption". quote: "quote" + "attribution". bullet_reveal: "title" + "bullets".
Example scene: {"narration":"Black holes warp space itself.","visual":{"template":"image_caption","imageQuery":"black hole space","caption":"Spacetime bends"}}
Output the JSON now.`;
  const PACK_IDS = ["editorial", "boldpop", "cinematic", "tech", "retro", "minimal"];
  const attempt = async (): Promise<{ scenes: SceneDraft[]; stylePack: string | null }> => {
    const { text } = await generateText({
      model: getModel(input.provider, input.apiKey, input.model),
      prompt,
      temperature: 0.7,
    });
    let obj: any;
    try { obj = extractJson(text); } catch { return { scenes: [], stylePack: null }; }
    const arr = Array.isArray(obj?.scenes) ? obj.scenes : Array.isArray(obj) ? obj : [];
    const scenes = arr.map(normalizeScene).filter(Boolean) as SceneDraft[];
    const stylePack = typeof obj?.stylePack === "string" && PACK_IDS.includes(obj.stylePack) ? obj.stylePack : null;
    return { scenes, stylePack };
  };
  let result = await attempt();
  if (result.scenes.length < 4) result = await attempt(); // one retry
  if (result.scenes.length < 4) {
    throw new Error(
      "The model didn't return a usable script. Try a more capable model in the Model box (e.g. a current Gemini Pro), then regenerate."
    );
  }
  return result;
}