// lib/env.ts
// Startup environment check. Logs a clear, one-time warning naming any missing
// keys so a misconfigured deploy fails LOUDLY at boot — instead of cryptically
// mid-render or mid-TTS. It only WARNS; the app still boots (BYOK flows, the
// landing page, and graceful fallbacks must work even with a partial config).
// Never prints key values. LLM keys are NOT checked here — they're BYOK.

let checked = false;

export function checkEnvOnce(): void {
  if (checked) return;
  checked = true;
  if (typeof window !== "undefined") return; // server-only

  const required = [
    { key: "MURF_API_KEY", note: "voice narration won't work without it" },
    { key: "PEXELS_API_KEY", note: "stock photos/b-roll won't load without it" },
  ];
  const recommended = [
    { key: "DEEPGRAM_API_KEY", note: "captions fall back to estimated timing" },
  ];
  const optional = [
    { key: "JAMENDO_CLIENT_ID", note: "music falls back to local /public/music" },
  ];

  const missingRequired = required.filter((v) => !process.env[v.key]);
  const missingRecommended = recommended.filter((v) => !process.env[v.key]);
  const missingOptional = optional.filter((v) => !process.env[v.key]);

  if (!missingRequired.length && !missingRecommended.length && !missingOptional.length) {
    console.log("[env] All API keys present. ✓");
    return;
  }

  const lines: string[] = ["\n──────── Reelify environment check ────────"];
  for (const v of missingRequired) lines.push(`  ❌ ${v.key} MISSING (required) — ${v.note}`);
  for (const v of missingRecommended) lines.push(`  ⚠  ${v.key} missing (recommended) — ${v.note}`);
  for (const v of missingOptional) lines.push(`  •  ${v.key} not set (optional) — ${v.note}`);
  if (missingRequired.length) lines.push("  → Add the missing keys to .env.local (see .env.example).");
  lines.push("───────────────────────────────────────────\n");
  console.warn(lines.join("\n"));
}