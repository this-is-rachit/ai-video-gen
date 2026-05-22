// lib/llm.ts
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";

export type Provider = "openai" | "anthropic" | "google" | "xai";

// Sensible defaults. Model names change often — if one errors with
// "model not found", just pass a current model ID from that provider's
// docs. The UI lets the user override this field.
export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-4o",
  anthropic: "claude-3-5-sonnet-latest",
  google: "gemini-1.5-pro",
  xai: "grok-2-latest",
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  google: "Google (Gemini)",
  xai: "xAI (Grok)",
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
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}