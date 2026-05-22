// app/api/falcon-test/route.ts
import { synthesize } from "@/lib/falcon";

export const runtime = "nodejs"; // the ws library needs the Node runtime

export async function POST(req: Request) {
  try {
    const { text, voiceId, locale } = await req.json();
    if (!text?.trim()) {
      return Response.json({ error: "Enter some text first." }, { status: 400 });
    }
    const wav = await synthesize(text, { voiceId, locale });
    return new Response(new Uint8Array(wav), {
      headers: { "Content-Type": "audio/wav" },
    });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Falcon error" }, { status: 500 });
  }
}