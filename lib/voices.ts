// lib/voices.ts
export const VOICE_BY_LOCALE: Record<string, string> = {
  "en-US": "Matthew",
  "en-UK": "Hazel",
  "hi-IN": "Aman",
  "es-ES": "Carla",
  "fr-FR": "Amara",
};

export function voiceForLocale(locale: string, fallback = "Matthew"): string {
  return VOICE_BY_LOCALE[locale] ?? fallback;
}