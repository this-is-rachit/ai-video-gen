// app/api/projects/[id]/voice/route.ts
import { NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/store";
import { synthesize } from "@/lib/falcon";
import { saveSceneAudio, wavDurationSeconds, buildMasterTrack, mapWithConcurrency } from "@/lib/audio";
import { voiceForLocale } from "@/lib/voices";
import { secondsToFrames } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;            // Next 15: params is async
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (project.scenes.length === 0) return NextResponse.json({ error: "No scenes to voice." }, { status: 400 });

  try {
    project.status = "voicing";
    await saveProject(project);

    const voiceId = voiceForLocale(project.language, project.voiceId);

    // Falcon's global endpoint allows few parallel streams — keep it at 2.
    const wavs = await mapWithConcurrency(project.scenes, 2, async (scene) => {
      const wav = await synthesize(scene.narration, { voiceId, locale: project.language });
      scene.audioUrl = await saveSceneAudio(project.id, scene.id, wav);
      scene.durationFrames = secondsToFrames(wavDurationSeconds(wav), project.fps);
      return wav;
    });

    const masterUrl = await buildMasterTrack(project.id, wavs);

    project.status = "draft";
    const saved = await saveProject(project);
    return NextResponse.json({ ...saved, masterUrl });
  } catch (err: any) {
    project.status = "error";
    await saveProject(project);
    return NextResponse.json({ error: err?.message ?? "Voicing failed" }, { status: 500 });
  }
}