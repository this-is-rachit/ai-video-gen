// lib/usage.ts
// Persistent Murf character-budget guard. The Murf Falcon allowance is a
// ONE-TIME ~100k characters with NO refill, so this is the single most
// important safety in the app. It never changes video output — it only
// permits/refuses voicing and tracks how many characters have been spent.
//
// Pre-check (estimateChars + canAfford) refuses a whole script up front so we
// never burn half a video's credits then stop. Per-scene recordUsage() keeps
// the running total honest even if a generation dies midway.

import { promises as fs } from "fs";
import path from "path";

const USAGE_FILE = path.join(process.cwd(), "data", "usage.json");

function budget(): number {
  const v = Number(process.env.MURF_CHAR_BUDGET);
  return Number.isFinite(v) && v > 0 ? v : 95000; // ~5k headroom under the 100k cap
}

interface UsageState { murfChars: number; updatedAt: string }

async function read(): Promise<UsageState> {
  try {
    const raw = await fs.readFile(USAGE_FILE, "utf8");
    const obj = JSON.parse(raw);
    const n = Number(obj?.murfChars);
    return { murfChars: Number.isFinite(n) && n >= 0 ? n : 0, updatedAt: obj?.updatedAt ?? "" };
  } catch {
    return { murfChars: 0, updatedAt: "" };
  }
}

async function write(state: UsageState): Promise<void> {
  try {
    await fs.mkdir(path.dirname(USAGE_FILE), { recursive: true });
    await fs.writeFile(USAGE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e: any) {
    // Non-fatal: don't fail a render over a counter write. The next run's
    // pre-check still reads whatever was last persisted.
    console.warn(`[usage] could not persist usage: ${e?.message || e}`);
  }
}

/** Characters one synth call will consume — exactly the string Falcon receives. */
export function estimateChars(text: string): number {
  return (text ?? "").length;
}

/** Sum the characters a whole list of narrations will consume. */
export function estimateTotalChars(narrations: string[]): number {
  return narrations.reduce((a, t) => a + estimateChars(t), 0);
}

export interface BudgetCheck {
  ok: boolean;
  used: number;
  budget: number;
  remaining: number;
  needed: number;
}

/** Pre-check: would voicing `needed` more characters stay within budget? */
export async function canAfford(needed: number): Promise<BudgetCheck> {
  const b = budget();
  const { murfChars: used } = await read();
  const remaining = Math.max(0, b - used);
  return { ok: needed <= remaining, used, budget: b, remaining, needed };
}

/** Record characters actually spent (call after each successful synth). */
export async function recordUsage(chars: number): Promise<void> {
  if (!chars || chars <= 0) return;
  const state = await read();
  state.murfChars += chars;
  state.updatedAt = new Date().toISOString();
  await write(state);
}

/** Current usage snapshot (for future surfacing in the UI / a status route). */
export async function getUsage(): Promise<{ used: number; budget: number; remaining: number }> {
  const b = budget();
  const { murfChars: used } = await read();
  return { used, budget: b, remaining: Math.max(0, b - used) };
}