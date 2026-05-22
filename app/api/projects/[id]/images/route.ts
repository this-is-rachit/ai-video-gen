// app/api/projects/[id]/images/route.ts
import { NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/store";
import { searchPexelsImage } from "@/lib/pexels";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  let resolved = 0;
  for (const scene of project.scenes) {
    const q = scene.visual.imageQuery;
    if (!q || scene.visual.imageUrl) continue; // skip if none / already cached
    try {
      const r = await searchPexelsImage(q);
      if (r) { scene.visual.imageUrl = r.url; scene.visual.imageCredit = r.credit; resolved++; }
    } catch { /* leave unresolved; template handles missing image */ }
  }

  const saved = await saveProject(project);
  return NextResponse.json({ ...saved, resolved });
}