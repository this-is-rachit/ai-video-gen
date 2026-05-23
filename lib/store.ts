// lib/store.ts
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Project, ProjectSchema, Scene, SceneDraft } from "./schema";

const DATA_DIR = path.join(process.cwd(), "data", "projects");

async function ensureDir() { await fs.mkdir(DATA_DIR, { recursive: true }); }
function fileFor(id: string) { return path.join(DATA_DIR, `${id}.json`); }

export async function createProject(input: {
  topic: string; language?: string; voiceId?: string; style?: string;
}): Promise<Project> {
  const now = new Date().toISOString();
  const project = ProjectSchema.parse({
    id: `proj_${randomUUID().slice(0, 8)}`,
    topic: input.topic,
    language: input.language ?? "en-US",
    voiceId: input.voiceId ?? "Matthew",
    style: input.style ?? "explainer",
    fps: 30,
    status: "draft",
    scenes: [],
    videoUrl: null,
    createdAt: now,
    updatedAt: now,
  });
  return saveProject(project);
}

export async function saveProject(project: Project): Promise<Project> {
  await ensureDir();
  project.updatedAt = new Date().toISOString();
  const valid = ProjectSchema.parse(project);            // validate on every write
  await fs.writeFile(fileFor(valid.id), JSON.stringify(valid, null, 2), "utf8");
  return valid;
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const raw = await fs.readFile(fileFor(id), "utf8");
    return ProjectSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function listProjects(): Promise<Project[]> {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const out: Project[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, f), "utf8");
      out.push(ProjectSchema.parse(JSON.parse(raw)));
    } catch { /* skip corrupt files */ }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function clearAllProjects(): Promise<number> {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  let n = 0;
  for (const f of files) {
    if (f.endsWith(".json")) { await fs.unlink(path.join(DATA_DIR, f)).catch(() => {}); n++; }
  }
  for (const sub of ["audio", "cache", "videos"]) {
    try { await fs.rm(path.join(process.cwd(), "public", sub), { recursive: true, force: true }); } catch {}
  }
  return n;
}

// Turn an LLM draft into a full Scene with an id + empty timing fields
export function newScene(draft: SceneDraft): Scene {
  return {
    id: `scene_${randomUUID().slice(0, 8)}`,
    narration: draft.narration,
    visual: draft.visual,
    audioUrl: null,
    durationFrames: null,
    words: [],
  };
}