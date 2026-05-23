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

type Job = { status: "rendering" | "done" | "error"; progress: number; videoUrl?: string; error?: string; quality?: Quality };

const jobs = new Map<string, Job>();
export const getJob = (id: string) => jobs.get(id);

const PUBLIC_DIR = path.join(process.cwd(), "public");

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
  if (jobs.get(id)?.status === "rendering") return;
  jobs.set(id, { status: "rendering", progress: 0, quality });
  await saveProgress(id, { status: "rendering", renderProgress: 0, renderQuality: quality, videoUrl: null });

  (async () => {
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
      const cores = os.cpus()?.length || 4;
      const concurrency = quality === "hd"
        ? Math.max(2, Math.min(4, cores))
        : Math.max(2, Math.min(6, cores));

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
  })();
}