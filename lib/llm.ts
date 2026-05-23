// lib/llm.ts
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

export type Provider = "openai" | "anthropic" | "google" | "xai" | "groq";

// Sensible defaults. Model names change often — if one errors with
// "model not found", just pass a current model ID from that provider's
// docs. The UI lets the user override this field.
export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-5.4-mini",
  anthropic: "claude-sonnet-4-6",
  google: "gemini-3.5-flash",
  xai: "grok-4.3",
  groq: "llama-3.3-70b-versatile",
};

/**
 * Returns an AI SDK model built from the USER'S key.
 * Same return type for every provider, so the rest of the app
 * never has to care which one was chosen.
 */
export function getModel(
  provider: Provider,
  apiKey: string,
  modelName?: string
): LanguageModel {
  const model = modelName?.trim() || DEFAULT_MODELS[provider];

  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
    case "xai":
      return createXai({ apiKey })(model);
    case "groq":
      return createGroq({ apiKey })(model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}