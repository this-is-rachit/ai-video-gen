// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { createProject, listProjects, saveProject, newScene } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await listProjects());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const project = await createProject({ topic: body.topic || "Sample: How rainbows form" });

  // add sample scenes so we can see the data shape end-to-end
  project.scenes.push(
    newScene({
      narration: "A rainbow appears when sunlight passes through raindrops.",
      visual: { template: "title_card", title: "How Rainbows Form" },
    }),
    newScene({
      narration: "Each drop bends and splits the light into seven colors.",
      visual: { template: "image_caption", imageQuery: "rainbow sky", caption: "Light splitting into colors" },
    }),
  );
  await saveProject(project);
  return NextResponse.json(project);
}