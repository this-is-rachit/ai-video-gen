// lib/render.ts
import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia, ensureBrowser } from "@remotion/renderer";
import { getProject, saveProject } from "./store";
import { localizeAssets } from "./assets";
export type Quality = "quick" | "hd";
const PRESETS: Record<Quality, { scale: number; x264Preset: any; crf: number; jpegQuality: number }> = {
  quick: { scale: 2 / 3, x264Preset: "veryfast", crf: 26, jpegQuality: 80 },
  hd:    { scale: 1,     x264Preset: "fast",     crf: 21, jpegQuality: 90 },
};
type Job = { status: "queued" | "rendering" | "done" | "error"; progress: number; videoUrl?: string; error?: string; quality?: Quality };
const jobs = new Map<string, Job>();
export const getJob = (id: string) => jobs.get(id);
const PUBLIC_DIR = path.join(process.cwd(), "public");

// ── Single-flight render queue ──
// Full-res HD renders spin up several Chromium tabs each; running two DIFFERENT
// renders at once exhausts memory ("Target closed"). So only ONE render runs at
// a time; others wait their turn. startRender stays non-blocking — it enqueues
// and returns immediately, exactly as the API route expects.
let activeRender = false;
const renderQueue: Array<() => Promise<void>> = [];
const queuedIds: string[] = []; // ids waiting, in order, for position reporting

/** How many renders are ahead of `id` in the queue (0 = next up / running). */
export function queuePositionOf(id: string): number {
  const i = queuedIds.indexOf(id);
  return i < 0 ? 0 : i;
}

async function pumpQueue() {
  if (activeRender) return;
  const next = renderQueue.shift();
  if (!next) return;
  activeRender = true;
  try {
    await next();
  } finally {
    activeRender = false;
    // hand off to the next queued render (if any)
    void pumpQueue();
  }
}

async function saveProgress(id: string, patch: Partial<{ status: string; renderProgress: number; renderQuality: Quality; videoUrl: string | null }>) {
  try {
    const p = await getProject(id);
    if (!p) return;
    Object.assign(p, patch);
    await saveProject(p);
  } catch { /* non-fatal: in-memory job is still the primary source */ }
}
let cachedServeUrl: string | null = null;
async function getServeUrl(): Promise<string> {
  if (cachedServeUrl) return cachedServeUrl;
  console.log("[render] bundling composition (first time ~1 min)...");
  cachedServeUrl = await bundle({
    entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
    publicDir: PUBLIC_DIR,
    webpackOverride: (config) => ({
      ...config,
      resolve: { ...config.resolve, alias: { ...(config.resolve?.alias || {}), "@": process.cwd() } },
    }),
  });
  console.log("[render] bundle ready.");
  return cachedServeUrl;
}
let warmed = false;
export async function warmRenderer(): Promise<void> {
  if (warmed) return;
  warmed = true;
  try { await ensureBrowser(); await getServeUrl(); console.log("[render] warmed up."); } catch {}
}
export async function startRender(id: string, quality: Quality = "quick"): Promise<void> {
  // Don't double-schedule the same project (already rendering OR already queued).
  const existing = jobs.get(id);
  if (existing && (existing.status === "rendering" || existing.status === "queued")) return;

  // Mark queued up-front so the UI poller + disk fallback see a consistent state.
  jobs.set(id, { status: "queued", progress: 0, quality });
  await saveProgress(id, { status: "rendering", renderProgress: 0, renderQuality: quality, videoUrl: null });

  // Enqueue the actual render work; it runs when no other render is active.
  queuedIds.push(id);
  renderQueue.push(() => runRender(id, quality));
  void pumpQueue();
}

async function runRender(id: string, quality: Quality): Promise<void> {
  const qi = queuedIds.indexOf(id);
  if (qi >= 0) queuedIds.splice(qi, 1); // it's running now, no longer waiting
  jobs.set(id, { status: "rendering", progress: 0, quality });
  try {
    const project = await getProject(id);
    if (!project) throw new Error("Project not found");
    if (!project.scenes.length) throw new Error("No scenes to render");
    await ensureBrowser();
    console.log(`[render] ${id} caching assets locally...`);
    const localized = await localizeAssets(project);
    project.scenes = localized.scenes;
    project.musicUrl = localized.musicUrl;
    await saveProject(project);
    const serveUrl = await getServeUrl();
    const inputProps = { project: localized };
    const composition = await selectComposition({ serveUrl, id: "main", inputProps });
    const outDir = path.join(PUBLIC_DIR, "videos");
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, `${id}.mp4`);
    // Concurrency was 8 (= all cores). Full-res HD × 8 Chromium tabs ran the
    // tabs out of memory ("ProtocolError: Target closed"). Cap HD low; leave
    // headroom so a dev recompile of another page can't fully starve it.
    //
    // Containers gotcha: os.cpus().length reports the HOST cores (e.g. 6+ on a
    // shared Railway box), not the cgroup-limited cores allocated to us (2).
    // Remotion uses its own cgroup-aware count and refuses concurrency above
    // that, so we use os.availableParallelism() which reads cpu.max via libuv.
    // RENDER_CONCURRENCY env var lets you pin a value if auto-detect misfires.
    const detected =
      typeof os.availableParallelism === "function"
        ? os.availableParallelism()
        : (os.cpus()?.length || 2);
    const cores = Number(process.env.RENDER_CONCURRENCY) || detected;
    const concurrency = quality === "hd"
      ? Math.max(1, Math.min(4, cores))
      : Math.max(1, Math.min(6, cores));
    const cfg = PRESETS[quality];
    console.log(`[render] ${id} rendering ${composition.durationInFrames} frames | ${quality} | concurrency ${concurrency}`);
    let lastSaved = 0;
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outPath,
      inputProps,
      imageFormat: "jpeg",
      jpegQuality: cfg.jpegQuality,
      scale: cfg.scale,
      x264Preset: cfg.x264Preset,
      crf: cfg.crf,
      audioCodec: "aac",
      audioBitrate: "192k",
      concurrency,
      // hardwareAcceleration removed: your logs show it was auto-disabled by
      // `crf` ("Hardware accelerated encoding disabled"). Software x264 with
      // veryfast/fast + crf is stable & predictable on a laptop.
      offthreadVideoCacheSizeInBytes: 512 * 1024 * 1024,
      timeoutInMilliseconds: 180000,
      chromiumOptions: { gl: "angle", headless: true },
      onProgress: ({ progress }) => {
        jobs.set(id, { status: "rendering", progress, quality });
        if (progress - lastSaved >= 0.05) {
          lastSaved = progress;
          void saveProgress(id, { status: "rendering", renderProgress: progress, renderQuality: quality });
        }
      },
    });
    const videoUrl = `/videos/${id}.mp4`;
    project.videoUrl = videoUrl;
    project.status = "done";
    project.renderProgress = 1;
    await saveProject(project);
    jobs.set(id, { status: "done", progress: 1, videoUrl, quality });
    console.log(`[render] ${id} ✅ DONE (${quality}) -> ${videoUrl}`);
  } catch (e: any) {
    console.error(`[render] ${id} ❌ ${e?.message || e}`);
    jobs.set(id, { status: "error", progress: 0, error: e?.message || "Render failed" });
    await saveProgress(id, { status: "error" });
  }
}