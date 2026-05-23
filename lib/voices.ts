// lib/voices.ts
// Curated Falcon languages + their selectable voice personas.
// Every voiceId verified against Murf's live Falcon voice library
// (murf.ai/api/docs/voices-styles/voice-library). Falcon voices all use the
// single "Conversation" style, so we expose persona choice (voiceId), not style.

export interface VoicePersona {
  voiceId: string;  // Falcon voice ID
  name: string;     // shown in the Voice dropdown
}

export interface LangOption {
  locale: string;        // Falcon locale sent to the TTS websocket
  label: string;         // shown in the Language dropdown
  voices: VoicePersona[]; // selectable personas; [0] is the default
}

// The 12 languages we ship, each with verified Falcon personas.
export const LANGUAGES: LangOption[] = [
  { locale: "en-US", label: "English (US)", voices: [
    { voiceId: "Matthew", name: "Matthew (m)" },
    { voiceId: "Amara",   name: "Amara (f)" },
    { voiceId: "Ken",     name: "Ken (m)" },
    { voiceId: "Daisy",   name: "Daisy (f)" },
    { voiceId: "River",   name: "River (n)" },
  ]},
  { locale: "en-IN", label: "English (India)", voices: [
    { voiceId: "Anisha",    name: "Anisha (f)" },
    { voiceId: "Nikhil",    name: "Nikhil (m)" },
    { voiceId: "Samar",     name: "Samar (m)" },
    { voiceId: "Tanushree", name: "Tanushree (f)" },
  ]},
  { locale: "hi-IN", label: "Hindi", voices: [
    { voiceId: "Aman",    name: "Aman (m)" },
    { voiceId: "Khyati",  name: "Khyati (f)" },
    { voiceId: "Karan",   name: "Karan (m)" },
    { voiceId: "Sunaina", name: "Sunaina (f)" },
    { voiceId: "Namrita", name: "Namrita (f)" },
  ]},
  { locale: "es-ES", label: "Spanish", voices: [
    { voiceId: "Carla",  name: "Carla (f)" },
    { voiceId: "Javier", name: "Javier (m)" },
  ]},
  { locale: "fr-FR", label: "French", voices: [
    { voiceId: "Amara",     name: "Amara (f)" },
    { voiceId: "Axel",      name: "Axel (m)" },
    { voiceId: "Guillaume", name: "Guillaume (m)" },
  ]},
  { locale: "de-DE", label: "German", voices: [
    { voiceId: "Lara",      name: "Lara (f)" },
    { voiceId: "Matthias",  name: "Matthias (m)" },
    { voiceId: "Josephine", name: "Josephine (f)" },
    { voiceId: "Ralf",      name: "Ralf (m)" },
  ]},
  { locale: "pt-BR", label: "Portuguese", voices: [
    { voiceId: "Isadora", name: "Isadora (f)" },
    { voiceId: "Heitor",  name: "Heitor (m)" },
    { voiceId: "Gustavo", name: "Gustavo (m)" },
    { voiceId: "Eloa",    name: "Eloa (f)" },
  ]},
  { locale: "it-IT", label: "Italian", voices: [
    { voiceId: "Giulia", name: "Giulia (f)" },
    { voiceId: "Angelo", name: "Angelo (m)" },
  ]},
  { locale: "ja-JP", label: "Japanese", voices: [
    { voiceId: "Kenji", name: "Kenji (m)" },
    { voiceId: "Kimi",  name: "Kimi (f)" },
    { voiceId: "Denki", name: "Denki (m)" },
  ]},
  { locale: "ko-KR", label: "Korean", voices: [
    { voiceId: "JangMi",   name: "JangMi (f)" },
    { voiceId: "Jong-su",  name: "Jong-su (m)" },
    { voiceId: "SangHoon", name: "SangHoon (m)" },
  ]},
  { locale: "zh-CN", label: "Chinese", voices: [
    { voiceId: "Wei",    name: "Wei (m)" },
    { voiceId: "Jiao",   name: "Jiao (f)" },
    { voiceId: "Baolin", name: "Baolin (m)" },
    { voiceId: "Zhang",  name: "Zhang (m)" },
  ]},
  { locale: "bn-IN", label: "Bengali", voices: [
    { voiceId: "Abhik", name: "Abhik (m)" },
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
  return BY_LOCALE[locale]?.voices[0]?.voiceId ?? "Matthew";
}

/**
 * Resolve the voice to actually send to Falcon. If the requested voiceId is
 * valid for the locale, use it; otherwise fall back to the locale's default.
 * (Prevents an en-US voice leaking into a Hindi render, etc.)
 */
export function voiceForLocale(locale: string, requestedVoiceId?: string | null): string {
  const list = BY_LOCALE[locale]?.voices ?? [];
  if (requestedVoiceId && list.some((v) => v.voiceId === requestedVoiceId)) return requestedVoiceId;
  return list[0]?.voiceId ?? "Matthew";
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