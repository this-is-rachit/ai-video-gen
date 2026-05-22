// lib/align.ts
import { Word } from "./schema";

const DG_URL = "https://api.deepgram.com/v1/listen";

/** Map our Falcon locale to a Deepgram language code. */
export function localeToDeepgramLang(locale: string): string {
  const base = locale.toLowerCase();
  const map: Record<string, string> = {
    "en-us": "en", "en-uk": "en", "en-in": "en", "en-au": "en",
    "hi-in": "hi", "es-es": "es", "es-mx": "es",
    "fr-fr": "fr", "fr-ca": "fr", "de-de": "de", "it-it": "it",
    "pt-br": "pt", "ja-jp": "ja", "ko-kr": "ko", "zh-cn": "zh", "nl-nl": "nl",
  };
  return map[base] ?? base.split("-")[0];
}

/** Get word-level timestamps for one audio clip. Times are relative to the clip start. */
export async function alignWithDeepgram(wav: Buffer, locale: string): Promise<Word[]> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY missing in .env.local");

  const lang = localeToDeepgramLang(locale);
  // nova-3 = best for English; nova-2 covers 40+ languages.
  const model = lang === "en" ? "nova-3" : "nova-2";

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