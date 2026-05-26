// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/store";
import { rateLimit, clientIp, LIMITS } from "@/lib/ratelimit";
import { estimateTotalChars, canAfford } from "@/lib/usage";
import { mergeVisualEdit, revoiceScene } from "@/lib/edit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(project);
}

// Apply scene edits. Text/structure edits are free; a narration change triggers
// a budget-guarded re-voice + re-align of that scene. Budget is pre-checked for
// ALL changed narrations up front, so an edit either fits or is refused whole.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(`edit:${clientIp(req)}`, LIMITS.edit);
  if (!rl.ok) {
    return NextResponse.json(
      { service: "ratelimit", error: `Too many edits from this device. Please wait about ${rl.retryAfterSec}s and try again.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  try {
    const { id } = await params;
    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const edits = Array.isArray(body?.scenes) ? body.scenes : [];
    if (!edits.length) return NextResponse.json({ service: "input", error: "No edits provided." }, { status: 400 });

    const byId = new Map(project.scenes.map((s) => [s.id, s]));

    // 1) Detect which scenes need re-voicing (narration actually changed).
    const revoiceTargets: { scene: any; narration: string }[] = [];
    for (const e of edits) {
      const scene = byId.get(e?.id);
      if (!scene) continue;
      if (typeof e.narration === "string") {
        const nn = e.narration.trim();
        if (nn && nn !== scene.narration) revoiceTargets.push({ scene, narration: nn });
      }
    }

    // 2) Budget pre-check for re-voicing (whole-or-nothing).
    const needed = estimateTotalChars(revoiceTargets.map((t) => t.narration));
    if (needed > 0) {
      const afford = await canAfford(needed);
      if (!afford.ok) {
        return NextResponse.json(
          { service: "murf", error: `Re-voicing these edits needs ~${needed.toLocaleString()} voice characters but only ${afford.remaining.toLocaleString()} of the ${afford.budget.toLocaleString()} Murf budget remain. Shorten the narration or edit fewer scenes.` },
          { status: 400 }
        );
      }
    }

    // 3) Apply text/visual edits (free + safe; template & media fields preserved).
    for (const e of edits) {
      const scene = byId.get(e?.id);
      if (!scene) continue;
      if (typeof e.narration === "string" && e.narration.trim()) scene.narration = e.narration.trim();
      if (e.visual && typeof e.visual === "object") scene.visual = mergeVisualEdit(scene.visual, e.visual);
    }

    // 4) Re-voice changed-narration scenes (sequential; budget already reserved).
    const warnings: string[] = [];
    for (const t of revoiceTargets) {
      try { await revoiceScene(project, t.scene); }
      catch (err: any) { warnings.push(`Scene re-voice failed: ${err?.message || err}`); }
    }

    // Editing invalidates the previous render — the user re-renders to get a new MP4.
    project.videoUrl = null;
    project.status = "done";
    const saved = await saveProject(project);
    return NextResponse.json({ ...saved, warnings });
  } catch (e: any) {
    console.error("[edit route] PATCH failed:", e?.message || e);
    return NextResponse.json({ service: "server", error: e?.message || "Edit failed" }, { status: 500 });
  }
}