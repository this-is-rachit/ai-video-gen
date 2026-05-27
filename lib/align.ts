// lib/align.ts
import { Word } from "./schema";

const DG_URL = "https://api.deepgram.com/v1/listen";

/**
 * Map our Falcon locale to a Deepgram language code.
 * Codes verified against Deepgram's Models & Languages table (nova-3).
 */
export function localeToDeepgramLang(locale: string): string {
  const base = locale.toLowerCase();
  const map: Record<string, string> = {
    // English variants
    "en-us": "en-US", "en-uk": "en-GB", "en-gb": "en-GB", "en-in": "en-IN", "en-au": "en-AU",
    // our curated 12
    "hi-in": "hi",
    "es-es": "es", "es-mx": "es",
    "fr-fr": "fr", "fr-ca": "fr-CA",
    "de-de": "de",
    "pt-br": "pt-BR",
    "it-it": "it",
    "ja-jp": "ja",
    "ko-kr": "ko",
    "zh-cn": "zh-CN",
    "bn-in": "bn",
  };
  return map[base] ?? base.split("-")[0];
}

/**
 * nova-3 now covers all 12 of our languages as monolingual models and is more
 * accurate than nova-2, so we use it for everything. If Deepgram ever rejects a
 * language on nova-3, the studio route's estimation fallback still produces
 * captions — so this is safe.
 */
function modelForLang(_lang: string): string {
  return "nova-3";
}

/** Get word-level timestamps for one audio clip. Times are relative to the clip start. */
export async function alignWithDeepgram(wav: Buffer, locale: string): Promise<Word[]> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY missing in .env.local");

  const lang = localeToDeepgramLang(locale);
  const model = modelForLang(lang);

  const params = new URLSearchParams({
    model,
    language: lang,
    smart_format: "true",
    punctuate: "true",
  });

  const res = await fetch(`${DG_URL}?${params.toString()}`, {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": "audio/wav" },
    body: new Uint8Array(wav),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Deepgram ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
  return words.map((w: any) => ({
    text: w.punctuated_word ?? w.word,
    start: +Number(w.start).toFixed(3),
    end: +Number(w.end).toFixed(3),
  }));
}