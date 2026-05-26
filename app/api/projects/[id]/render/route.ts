// app/api/projects/[id]/render/route.ts
import { NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { rateLimit, clientIp, LIMITS } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit(`render:${clientIp(req)}`, LIMITS.render);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many render requests from this device. Please wait about ${rl.retryAfterSec}s and try again.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }
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

    // 1) In-memory job is the freshest source while it exists.
    const job = getJob(id);
    if (job) return NextResponse.json(job);

    // 2) Fallback: reconstruct status from the persisted project file. This is
    //    what lets the UI reconnect after a dev recompile wipes the job map —
    //    the render task is still running and still writing progress to disk.
    const project = await getProject(id);
    if (project?.videoUrl && project.status === "done") {
      return NextResponse.json({ status: "done", progress: 1, videoUrl: project.videoUrl });
    }
    if (project?.status === "rendering") {
      return NextResponse.json({ status: "rendering", progress: project.renderProgress ?? 0, quality: project.renderQuality ?? "quick" });
    }
    if (project?.status === "error") {
      return NextResponse.json({ status: "error", progress: 0, error: "Render failed (see server logs)" });
    }
    return NextResponse.json({ status: "idle", progress: 0 });
  } catch (e: any) {
    console.error("[render route] GET failed:", e?.message || e);
    return NextResponse.json({ status: "error", error: e?.message || "Status check crashed" }, { status: 500 });
  }
}