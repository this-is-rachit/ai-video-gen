// scripts/list-falcon-voices.js — one-off discovery, NO Murf credits consumed.
// Hits the public /v1/speech/voices catalog endpoint and saves the live
// Falcon voice list so we can build voices.ts from ground truth.
const fs = require("fs");
const path = require("path");

function getKey() {
  if (process.env.MURF_API_KEY) return process.env.MURF_API_KEY;
  for (const f of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(/^\s*MURF_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^['"]|['"]$/g, "").trim();
  }
  return null;
}

(async () => {
  const key = getKey();
  if (!key) {
    console.error("Missing MURF_API_KEY (not in env or .env/.env.local).");
    process.exit(1);
  }
  const url = "https://api.murf.ai/v1/speech/voices?model=FALCON";
  const res = await fetch(url, { headers: { "api-key": key } });
  if (!res.ok) {
    console.error("HTTP", res.status, await res.text());
    process.exit(1);
  }
  const raw = await res.json();
  const voices = Array.isArray(raw) ? raw : (raw.voices || raw.data || []);
  fs.writeFileSync("murf-falcon-voices.json", JSON.stringify(raw, null, 2));
  console.log(`Saved ${voices.length} voice records to murf-falcon-voices.json`);
  if (voices[0]) {
    console.log("\nFirst record (for field-name verification):");
    console.log(JSON.stringify(voices[0], null, 2));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
