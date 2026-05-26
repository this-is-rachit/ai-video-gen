// lib/ratelimit.ts
// In-memory sliding-window rate limiter. Single-instance only (state lives in
// this process and resets on restart/recompile — same lifecycle as the render
// job map). This is BURST/ABUSE protection; the Murf credit ceiling is handled
// separately by lib/usage.ts. Limits are overridable via env.

type Bucket = number[]; // request timestamps (ms)

const store = new Map<string, Bucket>();

export interface RateLimitConfig { windowMs: number; max: number; }
export interface RateLimitResult { ok: boolean; remaining: number; retryAfterSec: number; }

// Occasional global sweep so one-off IPs can't grow the map forever.
let opsSinceSweep = 0;
const SWEEP_EVERY = 500;
function maybeSweep(now: number, windowMs: number) {
  if (++opsSinceSweep < SWEEP_EVERY) return;
  opsSinceSweep = 0;
  for (const [k, arr] of store) {
    const fresh = arr.filter((t) => now - t < windowMs);
    if (fresh.length) store.set(k, fresh);
    else store.delete(k);
  }
}

/** Record a hit for `key` and report whether it's within the limit. */
export function rateLimit(key: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const fresh = (store.get(key) ?? []).filter((t) => now - t < cfg.windowMs);
  if (fresh.length >= cfg.max) {
    const retryAfterSec = Math.max(1, Math.ceil((cfg.windowMs - (now - fresh[0])) / 1000));
    store.set(key, fresh);
    maybeSweep(now, cfg.windowMs);
    return { ok: false, remaining: 0, retryAfterSec };
  }
  fresh.push(now);
  store.set(key, fresh);
  maybeSweep(now, cfg.windowMs);
  return { ok: true, remaining: cfg.max - fresh.length, retryAfterSec: 0 };
}

/** Best-effort client IP. On Railway the real client is the first x-forwarded-for entry. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

// Defaults: generous enough for a live demo from one IP, tight enough to stop a script.
export const LIMITS = {
  studio: { windowMs: envInt("RL_STUDIO_WINDOW_MS", 5 * 60_000), max: envInt("RL_STUDIO_MAX", 8) },
  render: { windowMs: envInt("RL_RENDER_WINDOW_MS", 5 * 60_000), max: envInt("RL_RENDER_MAX", 15) },
  edit:   { windowMs: envInt("RL_EDIT_WINDOW_MS", 5 * 60_000), max: envInt("RL_EDIT_MAX", 30) },
};