// lib/generate.ts
import { generateText } from "ai";
import { getModel, type Provider } from "./llm";
import { SceneDraftSchema, TEMPLATES, type SceneDraft } from "./schema";

export interface GenInput {
  topic: string;
  language: string;
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

  const parsed = SceneDraftSchema.safeParse({ narration, visual });
  return parsed.success ? parsed.data : null;
}

/** Step 2: ask for JSON text, parse + repair + validate ourselves (provider-agnostic). */
export async function writeScript(input: GenInput, facts: string): Promise<{ scenes: SceneDraft[]; stylePack: string | null }> {
  const prompt =
`Write a punchy, accurate 2-minute narrated explainer video script about "${input.topic}".

Use ONLY these researched facts:
${facts}

Return ONLY a JSON object (no markdown, no commentary) of this exact shape:
{"stylePack":"...","scenes":[{"narration":"...","visual":{"template":"...", ...fields}}]}
- "stylePack" = the visual style best fitting this topic, ONE of: editorial, boldpop, cinematic, tech, retro, minimal.
  (editorial=serious/finance/science, boldpop=fun listicles, cinematic=history/space/nature, tech=technology, retro=culture/music/games, minimal=clean default)

RULES:
- Narration in locale "${input.language}". 10-14 scenes. Each narration = ONE or TWO short spoken sentences. TOTAL ~280-340 words.
- visual.template is one of: ${TEMPLATES.join(", ")}. Vary them; don't repeat one more than ~3 times.
- KEEP TEXT SHORT so it fits the screen: title <= 6 words, subtitle <= 10 words, each bullet <= 8 words, caption <= 6 words, value <= 4 words (e.g. "13.8B years"), quote <= 25 words.
- Scene 1 = title_card. Last scene = outro.
- image_caption: set "imageQuery" = 2-4 vivid ENGLISH keywords (unique subject per scene).
- b_roll: set "bRollQuery" = 2-4 ENGLISH keywords for MOVING footage. Use 2-3 b_roll scenes.
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