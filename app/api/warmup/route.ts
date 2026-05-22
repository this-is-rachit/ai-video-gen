// app/api/warmup/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  try { const { warmRenderer } = await import("@/lib/render"); warmRenderer(); } catch {}
  return NextResponse.json({ ok: true });
}