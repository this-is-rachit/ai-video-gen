// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { listProjects, clearAllProjects } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await listProjects());
}

export async function DELETE() {
  const cleared = await clearAllProjects();
  console.log(`[video-gen] cleared ${cleared} project(s)`);
  return NextResponse.json({ cleared });
}