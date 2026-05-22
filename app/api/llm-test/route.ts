// app/api/llm-test/route.ts
import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getModel, type Provider } from "@/lib/llm";

export async function POST(req: Request) {
  try {
    const { provider, apiKey, model, prompt } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Paste an API key first." }, { status: 400 });
    }

    const { text } = await generateText({
      model: getModel(provider as Provider, apiKey, model),
      prompt: prompt || "Say hello in one short sentence.",
    });

    return NextResponse.json({ text });
  } catch (err: any) {
    // Surface the real provider error so you know if it's a bad key vs bad model name
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}