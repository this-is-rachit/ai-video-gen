// app/api/studio/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createProject, saveProject, newScene } from "@/lib/store";
import { researchTopic, writeScript } from "@/lib/generate";
import { synthesize } from "@/lib/falcon";
import { saveSceneAudio, wavDurationSeconds } from "@/lib/audio";
import { voiceForLocale } from "@/lib/voices";
import { secondsToFrames } from "@/lib/schema";
import { ensureSceneWords } from "@/lib/captions";
import { alignWithDeepgram } from "@/lib/align";
import { searchPexelsImages, searchPexelsVideos } from "@/lib/pexels";
import type { Provider } from "@/lib/llm";
import { pickMusic } from "@/lib/music";
import { rateLimit, clientIp, LIMITS } from "@/lib/ratelimit";
import { estimateTotalChars, estimateChars, canAfford, recordUsage } from "@/lib/usage";
export const runtime = "nodejs";
export const maxDuration = 300;
class StepError extends Error {
  constructor(public service: string, message: string) { super(message); this.name = "StepError"; }
}
export async function POST(req: Request) {
  const rl = rateLimit(`studio:${clientIp(req)}`, LIMITS.studio);
  if (!rl.ok) {
    return NextResponse.json(
      { service: "ratelimit", error: `Too many video generations from this device. Please wait about ${rl.retryAfterSec}s and try again.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  let project: any = null;
  const warnings: string[] = [];
  try {
    const { topic, language, voiceId, style, provider, apiKey, model, aspect } = await req.json();
    if (!topic?.trim()) return NextResponse.json({ service: "input", error: "Please enter a topic." }, { status: 400 });
    if (!apiKey) return NextResponse.json({ service: "byok", error: "Add your LLM API key in settings." }, { status: 400 });
    const lang = language || "en-US";
    // 1) PROJECT
    project = await createProject({ topic, language: lang, voiceId, style });
    project.aspect = aspect === "landscape" ? "landscape" : "portrait";
    await saveProject(project);
    console.log(`\n[studio] ${project.id} ▶ "${topic}" (${lang}) via ${provider}`);
    // 2) SCRIPT — fatal if it fails
    project.status = "scripting"; await saveProject(project);
    let drafts;
    try {
      const gen = { topic, language: lang, provider: provider as Provider, apiKey, model };
      const facts = await researchTopic(gen);
      drafts = await writeScript(gen, facts);
    } catch (e: any) {
      throw new StepError("byok", `LLM (${provider}) failed: ${e?.message || e}`);
    }
    project.scenes = drafts.scenes.map(newScene);
    project.stylePack = drafts.stylePack ?? null;
    await saveProject(project);
    console.log(`[studio] ${project.id} ✓ script (${project.scenes.length} scenes)`);
    // 3) VOICE — fatal if it fails
    // Budget pre-check: refuse the WHOLE script up front rather than spending
    // half the credits then stopping. Murf chars are one-time and non-refillable.
    const needed = estimateTotalChars(project.scenes.map((s: any) => s.narration));
    const afford = await canAfford(needed);
    if (!afford.ok) {
      throw new StepError(
        "murf",
        `This script needs ~${needed.toLocaleString()} voice characters but only ${afford.remaining.toLocaleString()} of the ${afford.budget.toLocaleString()} Murf budget remain. Try a shorter video or a shorter topic.`
      );
    }
    project.status = "voicing"; await saveProject(project);
    const voice = voiceForLocale(lang, project.voiceId);
    for (const [i, scene] of project.scenes.entries()) {
      try {
        const wav = await synthesize(scene.narration, { voiceId: voice, locale: lang });
        await recordUsage(estimateChars(scene.narration));
        scene.audioUrl = await saveSceneAudio(project.id, scene.id, wav);
        scene.durationFrames = secondsToFrames(wavDurationSeconds(wav), project.fps);
      } catch (e: any) {
        throw new StepError("murf", `Falcon failed on scene ${i + 1}/${project.scenes.length}: ${e?.message || e}`);
      }
    }
    console.log(`[studio] ${project.id} ✓ voice`);
    // 4) CAPTIONS — non-fatal (estimation fallback)
    project.status = "aligning"; await saveProject(project);
    let dgFallback = 0;
    for (const scene of project.scenes) {
      scene.words = [];
      try {
        if (!process.env.DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY missing");
        const buf = await fs.readFile(path.join(process.cwd(), "public", scene.audioUrl!));
        scene.words = await alignWithDeepgram(buf, lang);
        if (!scene.words.length) { ensureSceneWords(scene, project.fps); dgFallback++; }
      } catch (e: any) {
        ensureSceneWords(scene, project.fps); dgFallback++;
        console.warn(`[studio] ${project.id} ⚠ deepgram: ${e?.message || e}`);
      }
    }
    if (dgFallback) warnings.push(`${dgFallback} scene(s) used estimated caption timing (Deepgram unavailable/limit).`);
    console.log(`[studio] ${project.id} ✓ captions`);
   // 5) MEDIA — aspect-aware (Pexels images + b-roll video + matching backgrounds)
    const ori: "portrait" | "landscape" = project.aspect === "landscape" ? "landscape" : "portrait";
    const usedImg = new Set<string>(), usedVid = new Set<string>();
    let noMedia = 0;
    for (const scene of project.scenes) {
      const v = scene.visual;
      try {
        if (v.template === "b_roll") {
          const vids = await searchPexelsVideos(v.bRollQuery || v.imageQuery || v.title || topic, 12, ori);
          const pick = vids.find((x) => !usedVid.has(x.id)) ?? vids[0];
          if (pick) { v.bRollUrl = pick.url; v.bRollCredit = pick.credit; usedVid.add(pick.id); } else noMedia++;
        } else if (v.template === "image_caption" && v.imageQuery) {
          const imgs = await searchPexelsImages(v.imageQuery, 15, ori);
          const pick = imgs.find((x) => !usedImg.has(x.id)) ?? imgs[0];
          if (pick) { v.imageUrl = pick.url; v.imageCredit = pick.credit; usedImg.add(pick.id); } else noMedia++;
        } else if (v.template === "montage" && Array.isArray(v.images) && v.images.length) {
          const urls: string[] = [];
          for (const q of v.images.slice(0, 5)) {
            const imgs = await searchPexelsImages(q, 8, ori);
            const pick = imgs.find((x) => !usedImg.has(x.id)) ?? imgs[0];
            if (pick) { urls.push(pick.url); usedImg.add(pick.id); }
          }
          if (urls.length >= 2) v.imageUrls = urls; else noMedia++;
        } else if (v.template === "comparison") {
          // comparison halves are tall slivers → fetch portrait crops regardless of overall aspect
          const grab = async (q?: string) => {
            if (!q) return null;
            const imgs = await searchPexelsImages(q, 8, "portrait");
            const pick = imgs.find((x) => !usedImg.has(x.id)) ?? imgs[0];
            if (pick) { usedImg.add(pick.id); return pick.url; }
            return null;
          };
          v.leftImageUrl = await grab(v.leftImageQuery);
          v.rightImageUrl = await grab(v.rightImageQuery);
          if (!v.leftImageUrl && !v.rightImageUrl) noMedia++;
        }
        // matching dim background for text scenes (whiteboard stays paper)
        if (v.bgImageQuery && v.template !== "whiteboard" && !v.imageUrl && !v.bRollUrl) {
          const imgs = await searchPexelsImages(v.bgImageQuery, 15, ori);
          const pick = imgs.find((x) => !usedImg.has(x.id)) ?? imgs[0];
          if (pick) { v.bgImageUrl = pick.url; usedImg.add(pick.id); }
        }
      } catch (e: any) {
        noMedia++;
        console.warn(`[studio] ${project.id} ⚠ pexels: ${e?.message || e}`);
      }
    }
    if (noMedia) warnings.push(`${noMedia} scene(s) had no stock media (Pexels limit or no match).`);
    console.log(`[studio] ${project.id} ✓ media (${ori})`);
   // 6) MUSIC — topic-matched (Jamendo by mood) with local fallback
    const scriptText = project.scenes
      .map((s: any) => [s.visual.title, s.visual.subtitle, s.visual.caption, s.visual.quote, ...(s.visual.bullets || [])].filter(Boolean).join(" "))
      .join(" ");
    const m = await pickMusic(topic, scriptText);
    project.musicUrl = m?.url ?? null;
    project.musicCredit = m?.credit ?? null;
    project.musicMood = m?.mood ?? null;
    if (m) console.log(`[studio] music mood: ${m.mood}`);
    else warnings.push("No music (add JAMENDO_CLIENT_ID to .env.local or drop mp3s in /public/music).");
    project.status = "done";
    const saved = await saveProject(project);
    console.log(`[studio] ${project.id} ✅ DONE${warnings.length ? " (with warnings)" : ""}\n`);
    return NextResponse.json({ ...saved, warnings });
  } catch (e: any) {
    const service = e?.name === "StepError" ? e.service : "server";
    const error = e?.message || "Unknown error";
    console.error(`\n[studio] ❌ FAILED at [${service}]: ${error}\n`);
    if (project) { project.status = "error"; try { await saveProject(project); } catch {} }
    return NextResponse.json({ service, error }, { status: 500 });
  }
}