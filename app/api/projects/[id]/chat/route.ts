// app/api/projects/[id]/chat/route.ts
// Natural-language edit endpoint. Calls the user's BYOK model to PROPOSE a text
// patch, sanitizes it to the editable surface, and returns it. It does NOT
// apply or persist anything — the client merges the patch into the editor and
// the user saves through the normal pipeline. Spends no Murf credits.
import { NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { rateLimit, clientIp, LIMITS } from "@/lib/ratelimit";
import { proposeEdits, sanitizeChatPatch } from "@/lib/chatedit";
import type { Provider } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(`chat:${clientIp(req)}`, LIMITS.edit);
  if (!rl.ok) {
    return NextResponse.json({ error: `Too many AI requests from this device. Please wait about ${rl.retryAfterSec}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  try {
    const { id } = await params;
    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { message, provider, apiKey, model, scenes } = body;
    if (!message?.trim()) return NextResponse.json({ error: "Type a request first." }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: "Add your LLM API key in Studio first." }, { status: 400 });

    const proposed = await proposeEdits({
      project,
      clientScenes: Array.isArray(scenes) ? scenes : [],
      message: String(message),
      provider: provider as Provider,
      apiKey: String(apiKey),
      model,
    });
    const clean = sanitizeChatPatch(project, proposed.scenes);
    return NextResponse.json({ reply: proposed.reply || "Here are the changes.", scenes: clean });
  } catch (e: any) {
    console.error("[chat route] failed:", e?.message || e);
    return NextResponse.json({ error: e?.message || "AI edit failed" }, { status: 500 });
  }
}