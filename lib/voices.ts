// lib/voices.ts
// Curated Falcon voices — every voiceId verified against Murf's live Falcon
// voice library (murf.ai/api/docs/voices-styles/voice-library). Falcon voices
// all use the single "Conversation" style.

export interface LangOption {
  locale: string;   // Falcon locale sent to the TTS websocket
  label: string;    // shown in the Studio dropdown
  voiceId: string;  // verified Falcon voice for this locale
}

// The 12 we ship. Order = how they appear in the dropdown.
export const LANGUAGES: LangOption[] = [
  { locale: "en-US", label: "English (US)",    voiceId: "Matthew" },
  { locale: "en-IN", label: "English (India)", voiceId: "Anisha"  },
  { locale: "hi-IN", label: "Hindi",           voiceId: "Aman"    },
  { locale: "es-ES", label: "Spanish",         voiceId: "Carla"   },
  { locale: "fr-FR", label: "French",          voiceId: "Amara"   },
  { locale: "de-DE", label: "German",          voiceId: "Lara"    },
  { locale: "pt-BR", label: "Portuguese",      voiceId: "Isadora" },
  { locale: "it-IT", label: "Italian",         voiceId: "Giulia"  },
  { locale: "ja-JP", label: "Japanese",        voiceId: "Kenji"   },
  { locale: "ko-KR", label: "Korean",          voiceId: "JangMi"  },
  { locale: "zh-CN", label: "Chinese",         voiceId: "Wei"     },
  { locale: "bn-IN", label: "Bengali",         voiceId: "Abhik"   },
];

// Fast lookup: locale -> voiceId
export const VOICE_BY_LOCALE: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.locale, l.voiceId])
);

/** Pick the Falcon voice for a locale, falling back to a sensible default. */
export function voiceForLocale(locale: string, fallback = "Matthew"): string {
  return VOICE_BY_LOCALE[locale] ?? fallback;
}

/** How many languages we actually support (used by the landing-page stat). */
export const LANGUAGE_COUNT = LANGUAGES.length;