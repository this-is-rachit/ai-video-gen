// app/preview/page.tsx
"use client";
import { useEffect, useState } from "react";
import { Player } from "@remotion/player";
import { MainVideo, totalFrames } from "@/remotion/Video";

export default function PreviewPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [id, setId] = useState("");
  const [project, setProject] = useState<any>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((list) => {
      setProjects(list);
      if (list[0]) setId(list[0].id);
    });
  }, []);

  async function loadProject(pid: string) {
    const p = (await (await fetch("/api/projects")).json()).find((x: any) => x.id === pid);
    setProject(p);
  }
  useEffect(() => { if (id) loadProject(id); }, [id]);

  async function resolveImages() {
    setStatus("Fetching images from Pexels...");
    const res = await fetch(`/api/projects/${id}/images`, { method: "POST" });
    const data = await res.json();
    setProject(data);
    setStatus(res.ok ? `✓ ${data.resolved} image(s) ready` : `❌ ${data.error}`);
  }

  const ready = project && project.scenes.length > 0 && project.scenes.every((s: any) => s.durationFrames);

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui", display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Video preview</h1>

      <select value={id} onChange={(e) => setId(e.target.value)} style={inp}>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.topic}</option>)}
      </select>

      <button onClick={resolveImages} disabled={!id} style={btn}>Resolve images (Pexels)</button>
      {status && <p style={{ fontSize: 13 }}>{status}</p>}

      {!ready && <p style={{ color: "#a16207" }}>This project needs scenes + voiceover first (run /generate then /voice, then /captions).</p>}

      {ready && (
        <div style={{ justifySelf: "center" }}>
          <Player
            component={MainVideo}
            inputProps={{ project }}
            durationInFrames={totalFrames(project)}
            fps={project.fps}
            compositionWidth={1080}
            compositionHeight={1920}
            controls
            style={{ width: 360, height: 640, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
          />
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: 8, border: "1px solid #d4d4d8", borderRadius: 8 };
const btn: React.CSSProperties = { padding: "10px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", width: "fit-content" };