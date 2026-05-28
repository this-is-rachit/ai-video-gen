// lib/voices.ts
// Curated Falcon languages + their selectable voice personas.
//
// Sourced from Murf's live Falcon catalog (GET /v1/speech/voices?model=FALCON)
// — see scripts/list-falcon-voices.js to refresh. Every voiceId below was
// present in that catalog response; previously this file included voices that
// looked right in third-party docs but did not actually exist in Falcon
// (Daisy, Abhik) and Murf rejected them at runtime.
//
// Voice IDs use the canonical "locale-name" form (e.g. en-US-matthew). Murf
// accepts both short and long forms, but the long form is unambiguous —
// "Amara" exists natively in en-US and via cross-locale in fr-FR, so the full
// ID makes the choice explicit.
//
// Falcon voices ship "Conversational" style only, so we expose persona choice
// (voiceId), not style.

export interface VoicePersona {
  voiceId: string;  // Falcon voice ID, e.g. "en-US-matthew"
  name: string;     // shown in the Voice dropdown
}

export interface LangOption {
  locale: string;        // Falcon locale sent to the TTS websocket
  label: string;         // shown in the Language dropdown
  voices: VoicePersona[]; // selectable personas; [0] is the default
}

// 12 languages, every persona verified against Murf's live Falcon catalog.
export const LANGUAGES: LangOption[] = [
  { locale: "en-US", label: "English (US)", voices: [
    { voiceId: "en-US-matthew", name: "Matthew (m)" },
    { voiceId: "en-US-amara",   name: "Amara (f)" },
    { voiceId: "en-US-ken",     name: "Ken (m)" },
    { voiceId: "en-US-natalie", name: "Natalie (f)" },
    { voiceId: "en-US-miles",   name: "Miles (m)" },
    { voiceId: "en-US-phoebe",  name: "Phoebe (f)" },
  ]},
  { locale: "en-IN", label: "English (India)", voices: [
    { voiceId: "en-IN-anisha",    name: "Anisha (f)" },
    { voiceId: "en-IN-nikhil",    name: "Nikhil (m)" },
    { voiceId: "en-IN-aarav",     name: "Aarav (m)" },
    { voiceId: "en-IN-tanushree", name: "Tanushree (f)" },
    { voiceId: "en-IN-samar",     name: "Samar (m)" },
    { voiceId: "en-IN-anusha",    name: "Anusha (f)" },
  ]},
  { locale: "hi-IN", label: "Hindi", voices: [
    { voiceId: "hi-IN-aman",    name: "Aman (m)" },
    { voiceId: "hi-IN-khyati",  name: "Khyati (f)" },
    { voiceId: "hi-IN-karan",   name: "Karan (m)" },
    { voiceId: "hi-IN-sunaina", name: "Sunaina (f)" },
    { voiceId: "hi-IN-namrita", name: "Namrita (f)" },
  ]},
  { locale: "es-ES", label: "Spanish", voices: [
    { voiceId: "es-ES-carla",   name: "Carla (f)" },
    { voiceId: "es-ES-javier",  name: "Javier (m)" },
    { voiceId: "es-ES-carmen",  name: "Carmen (f)" },
    { voiceId: "es-ES-enrique", name: "Enrique (m)" },
    { voiceId: "es-ES-elvira",  name: "Elvira (f)" },
  ]},
  { locale: "fr-FR", label: "French", voices: [
    { voiceId: "fr-FR-axel",      name: "Axel (m)" },
    { voiceId: "fr-FR-guillaume", name: "Guillaume (m)" },
  ]},
  { locale: "de-DE", label: "German", voices: [
    { voiceId: "de-DE-lara",      name: "Lara (f)" },
    { voiceId: "de-DE-matthias",  name: "Matthias (m)" },
    { voiceId: "de-DE-josephine", name: "Josephine (f)" },
    { voiceId: "de-DE-erna",      name: "Erna (f)" },
    { voiceId: "de-DE-ralf",      name: "Ralf (m)" },
  ]},
  { locale: "pt-BR", label: "Portuguese", voices: [
    { voiceId: "pt-BR-isadora", name: "Isadora (f)" },
    { voiceId: "pt-BR-heitor",  name: "Heitor (m)" },
    { voiceId: "pt-BR-gustavo", name: "Gustavo (m)" },
    { voiceId: "pt-BR-eloa",    name: "Eloa (f)" },
    { voiceId: "pt-BR-silvio",  name: "Silvio (m)" },
  ]},
  { locale: "it-IT", label: "Italian", voices: [
    { voiceId: "it-IT-giulia", name: "Giulia (f)" },
    { voiceId: "it-IT-angelo", name: "Angelo (m)" },
  ]},
  { locale: "ja-JP", label: "Japanese", voices: [
    { voiceId: "ja-JP-kenji", name: "Kenji (m)" },
    { voiceId: "ja-JP-kimi",  name: "Kimi (f)" },
    { voiceId: "ja-JP-denki", name: "Denki (m)" },
  ]},
  { locale: "ko-KR", label: "Korean", voices: [
    { voiceId: "ko-KR-jangmi",   name: "JangMi (f)" },
    { voiceId: "ko-KR-jong-su",  name: "Jong-su (m)" },
    { voiceId: "ko-KR-sanghoon", name: "SangHoon (m)" },
  ]},
  { locale: "zh-CN", label: "Chinese", voices: [
    { voiceId: "zh-CN-wei",    name: "Wei (f)" },
    { voiceId: "zh-CN-jiao",   name: "Jiao (f)" },
    { voiceId: "zh-CN-baolin", name: "Baolin (f)" },
    { voiceId: "zh-CN-zhang",  name: "Zhang (m)" },
    { voiceId: "zh-CN-tao",    name: "Tao (m)" },
  ]},
  { locale: "bn-IN", label: "Bengali", voices: [
    { voiceId: "bn-IN-subhankar", name: "Subhankar (m)" },
    { voiceId: "bn-IN-sourav",    name: "Sourav (m)" },
    { voiceId: "bn-IN-debarati",  name: "Debarati (f)" },
  ]},
];

// Fast lookups
const BY_LOCALE: Record<string, LangOption> = Object.fromEntries(
  LANGUAGES.map((l) => [l.locale, l])
);

/** All valid voiceIds for a locale (used by the UI dropdown). */
export function voicesForLocale(locale: string): VoicePersona[] {
  return BY_LOCALE[locale]?.voices ?? [];
}

/** The default voiceId for a locale ([0] in its list). */
export function defaultVoiceForLocale(locale: string): string {
  return BY_LOCALE[locale]?.voices[0]?.voiceId ?? "en-US-matthew";
}

/**
 * Resolve the voice to actually send to Falcon. If the requested voiceId is
 * valid for the locale, use it; otherwise fall back to the locale's default.
 * Also gracefully handles legacy projects stored with old short-form voiceIds
 * (e.g. "Matthew") — they no longer match, so the default is used instead.
 */
export function voiceForLocale(locale: string, requestedVoiceId?: string | null): string {
  const list = BY_LOCALE[locale]?.voices ?? [];
  if (requestedVoiceId && list.some((v) => v.voiceId === requestedVoiceId)) return requestedVoiceId;
  return list[0]?.voiceId ?? "en-US-matthew";
}

// Human-readable language name + native script note, used to instruct the LLM.
const LANGUAGE_NAMES: Record<string, string> = {
  "en-US": "English",
  "en-IN": "English (Indian)",
  "hi-IN": "Hindi (in Devanagari script)",
  "es-ES": "Spanish",
  "fr-FR": "French",
  "de-DE": "German",
  "pt-BR": "Brazilian Portuguese",
  "it-IT": "Italian",
  "ja-JP": "Japanese (in Japanese script)",
  "ko-KR": "Korean (in Hangul script)",
  "zh-CN": "Simplified Chinese (in Chinese characters)",
  "bn-IN": "Bengali (in Bengali script)",
};

/** Full language name for a locale (for LLM prompts). Falls back to the code. */
export function languageName(locale: string): string {
  return LANGUAGE_NAMES[locale] ?? locale;
}

/** How many languages we support (used by the landing-page stat). */
export const LANGUAGE_COUNT = LANGUAGES.length;
