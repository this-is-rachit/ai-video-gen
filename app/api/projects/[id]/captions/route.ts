// app/api/projects/[id]/captions/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getProject, saveProject } from "@/lib/store";
import { ensureSceneWords } from "@/lib/captions";
import { alignWithDeepgram } from "@/lib/align";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const missing = project.scenes.some((s) => !s.durationFrames);
  if (missing) return NextResponse.json({ error: "Run voiceover first (scenes need durations)." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "deepgram" ? "deepgram" : "estimate";

  // clear existing word timings so we rebuild fresh
  project.scenes.forEach((s) => (s.words = []));

  let usedFallback = 0;

  if (mode === "deepgram") {
    for (const scene of project.scenes) {
      try {
        if (!scene.audioUrl) throw new Error("scene has no audio");
        const filePath = path.join(process.cwd(), "public", scene.audioUrl);
        const wav = await fs.readFile(filePath);
        scene.words = await alignWithDeepgram(wav, project.language);
        if (scene.words.length === 0) { ensureSceneWords(scene, project.fps); usedFallback++; }
      } catch {
        ensureSceneWords(scene, project.fps); // graceful per-scene fallback
        usedFallback++;
      }
    }
  } else {
    project.scenes.forEach((s) => ensureSceneWords(s, project.fps));
  }

  const saved = await saveProject(project);
  return NextResponse.json({ ...saved, mode, usedFallback });
}