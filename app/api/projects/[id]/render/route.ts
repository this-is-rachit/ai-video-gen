// app/api/projects/[id]/render/route.ts
import { NextResponse } from "next/server";
import { getProject } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!project.scenes.length) return NextResponse.json({ error: "Generate a video first." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const quality = body.quality === "hd" ? "hd" : "quick";

    const { startRender } = await import("@/lib/render");
    await startRender(id, quality);
    return NextResponse.json({ started: true, quality });
  } catch (e: any) {
    console.error("[render route] POST failed:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Render route crashed" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { getJob } = await import("@/lib/render");
    const job = getJob(id);
    if (job) return NextResponse.json(job);
    const project = await getProject(id);
    if (project?.videoUrl) return NextResponse.json({ status: "done", progress: 1, videoUrl: project.videoUrl });
    return NextResponse.json({ status: "idle", progress: 0 });
  } catch (e: any) {
    console.error("[render route] GET failed:", e?.message || e);
    return NextResponse.json({ status: "error", error: e?.message || "Status check crashed" }, { status: 500 });
  }
}