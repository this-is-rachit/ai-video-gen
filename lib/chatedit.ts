// lib/chatedit.ts
// Chat-to-edit: turn a natural-language request into a VALIDATED text patch over
// the existing scenes. The LLM only PROPOSES — it never mutates the project.
// Output is sanitized to narration + the on-screen text fields each template
// actually renders, so it can never change templates, media, or structure, and
// can never reach remotion/. The patch is applied client-side and persisted via
// the same Save → budget-guarded re-voice pipeline as manual edits.
import { generateText } from "ai";
import { getModel, type Provider } from "./llm";
import { languageName } from "./voices";
import type { Project } from "./schema";

// The only fields editable per template (mirrors the editor's text fields).
const EDITABLE_BY_TEMPLATE: Record<string, string[]> = {
  title_card: ["title", "subtitle"],
  bullet_reveal: ["title", "bullets"],
  image_caption: ["caption"],
  b_roll: ["caption"],
  big_number: ["value", "caption"],
  quote: ["quote", "attribution"],
  whiteboard: ["title", "bullets"],
  outro: ["title", "subtitle"],
  montage: ["caption"],
  comparison: ["leftLabel", "rightLabel"],
};

function tolerantJson(text: string): any {
  let t = (text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a !== -1 && b !== -1 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

export interface ProposeInput {
  project: Project;
  clientScenes: any[]; // current editable view from the client (may include unsaved edits)
  message: string;
  provider: Provider;
  apiKey: string;
  model?: string;
}

/** Ask the BYOK model for a text-only edit patch. Returns a reply + raw scenes
 *  (raw is sanitized by sanitizeChatPatch before anything is trusted). */
export async function proposeEdits(input: ProposeInput): Promise<{ reply: string; scenes: any[] }> {
  const { project, clientScenes, message, provider, apiKey, model } = input;
  const lang = languageName(project.language || "en-US");
  const byId = new Map(project.scenes.map((s) => [s.id, s]));

  const ctx = (clientScenes || []).map((cs: any, i: number) => {
    const ps = byId.get(cs?.id);
    if (!ps) return null;
    const template = ps.visual.template;
    const fields = EDITABLE_BY_TEMPLATE[template] || [];
    const text: any = {};
    for (const f of fields) {
      const val = cs?.visual?.[f] ?? (ps.visual as any)[f];
      if (val !== undefined && val !== null) text[f] = val;
    }
    return { n: i + 1, id: cs.id, template, editable: fields, narration: cs?.narration ?? ps.narration, text };
  }).filter(Boolean);

  const prompt =
`You help a user edit an existing short explainer video by changing ONLY its text. The video's language is ${lang}.

CURRENT SCENES (JSON):
${JSON.stringify(ctx)}

Each scene lists "editable" (the only on-screen fields you may change for that scene), its current "text" values, and the spoken "narration".

USER REQUEST:
"${message}"

RULES:
- Change ONLY what the user asked for. Leave every other scene and field exactly as it is.
- You may edit ONLY "narration" and the fields named in that scene's "editable" list. NEVER change templates, NEVER add/remove/reorder scenes, NEVER touch images or media.
- Keep on-screen text very short: title <= 6 words, subtitle <= 10, caption <= 6, value <= 4, each bullet <= 8, quote <= 25 words. Narration = 1-2 short spoken sentences.
- Write all narration and on-screen text in ${lang}.
- Return ONLY the scenes you actually changed.

Respond with ONLY this JSON (no markdown, no commentary):
{"reply":"<one short friendly sentence describing what you changed>","scenes":[{"id":"<scene id>","narration":"<new narration, only if changed>","visual":{"<editable field>":"<new value>"}}]}
For bullets use {"bullets":["...","..."]}. If the request cannot be done by editing text alone, return {"reply":"<brief explanation>","scenes":[]}.`;

  const { text } = await generateText({ model: getModel(provider, apiKey, model), prompt, temperature: 0.4 });
  let obj: any;
  try { obj = tolerantJson(text); } catch { return { reply: "Sorry, I couldn't read that result — try rephrasing your request.", scenes: [] }; }
  const reply = typeof obj?.reply === "string" ? obj.reply : "Done.";
  const scenes = Array.isArray(obj?.scenes) ? obj.scenes : [];
  return { reply, scenes };
}

/** Strip an LLM patch down to ONLY valid edits: existing scene ids, narration as
 *  a string, and visual fields allowed for that scene's template. Anything else
 *  (templates, URLs, queries, unknown fields) is discarded. */
export function sanitizeChatPatch(project: Project, rawScenes: any[]): any[] {
  const byId = new Map(project.scenes.map((s) => [s.id, s]));
  const out: any[] = [];
  for (const r of rawScenes || []) {
    const ps = byId.get(r?.id);
    if (!ps) continue;
    const allowed = EDITABLE_BY_TEMPLATE[ps.visual.template] || [];
    const edit: any = { id: r.id };
    if (typeof r.narration === "string" && r.narration.trim()) edit.narration = r.narration.trim();
    const visual: any = {};
    if (r.visual && typeof r.visual === "object") {
      for (const f of allowed) {
        if (f === "bullets") {
          if (Array.isArray(r.visual.bullets)) {
            const b = r.visual.bullets.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim());
            if (b.length) visual.bullets = b;
          }
        } else if (typeof r.visual[f] === "string" && r.visual[f].trim()) {
          visual[f] = r.visual[f].trim();
        }
      }
    }
    if (Object.keys(visual).length) edit.visual = visual;
    if (edit.narration || edit.visual) out.push(edit);
  }
  return out;
}