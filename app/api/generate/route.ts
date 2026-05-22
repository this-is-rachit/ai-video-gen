// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { createProject, saveProject, newScene } from "@/lib/store";
import { researchTopic, writeScript } from "@/lib/generate";
import type { Provider } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 120; // two LLM calls can take a while

export async function POST(req: Request) {
  try {
    const { topic, language, voiceId, style, provider, apiKey, model } = await req.json();
    if (!topic?.trim()) return NextResponse.json({ error: "Enter a topic." }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: "Add your LLM API key in settings." }, { status: 400 });

    const project = await createProject({ topic, language, voiceId, style });
    project.status = "scripting";
    await saveProject(project);

    const gen = { topic, language: language || "en-US", provider: provider as Provider, apiKey, model };
    const facts = await researchTopic(gen);
    const drafts = await writeScript(gen, facts);

    project.scenes = drafts.map(newScene);
    project.status = "draft";
    const saved = await saveProject(project);

    return NextResponse.json(saved);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Generation failed" }, { status: 500 });
  }
}