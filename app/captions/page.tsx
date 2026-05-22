// app/captions/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";

export default function CaptionsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [id, setId] = useState("");
  const [mode, setMode] = useState<"deepgram" | "estimate">("deepgram");
  const [project, setProject] = useState<any>(null);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [t, setT] = useState(0);
  const [sceneIdx, setSceneIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((list) => {
      setProjects(list);
      if (list[0]) setId(list[0].id);
    });
  }, []);

  async function build() {
    setError(""); setInfo(""); setProject(null);
    const res = await fetch(`/api/projects/${id}/captions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setProject(data); setSceneIdx(0);
    setInfo(`Mode: ${data.mode}${data.usedFallback ? ` · ${data.usedFallback} scene(s) fell back to estimation` : ""}`);
  }

  const scene = project?.scenes?.[sceneIdx];

  return (
    <div style={{ maxWidth: 720, margin: "48px auto", fontFamily: "system-ui", display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Captions test</h1>

      <label>Project
        <select value={id} onChange={(e) => setId(e.target.value)} style={inp}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.topic}</option>)}
        </select>
      </label>

      <label>Timing method
        <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={inp}>
          <option value="deepgram">Deepgram word-timestamps (precise)</option>
          <option value="estimate">Smart estimation (no API)</option>
        </select>
      </label>

      <button onClick={build} disabled={!id} style={btn}>Build captions</button>
      {info && <p style={{ color: "#16a34a", fontSize: 13 }}>✓ {info}</p>}
      {error && <p style={{ color: "#dc2626" }}>❌ {error}</p>}

      {scene && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {project.scenes.map((s: any, i: number) => (
              <button key={s.id} onClick={() => { setSceneIdx(i); setT(0); }}
                style={{ ...pill, background: i === sceneIdx ? "#111" : "#fff", color: i === sceneIdx ? "#fff" : "#111" }}>
                #{i + 1}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.5, padding: 16, background: "#0b0b0c", borderRadius: 12 }}>
            {scene.words.map((w: any, i: number) => {
              const active = t >= w.start && t < w.end;
              return <span key={i} style={{ color: active ? "#fff" : "#52525b", transition: "color .08s" }}>{w.text} </span>;
            })}
          </div>

          {scene.audioUrl && (
            <audio ref={audioRef} controls src={scene.audioUrl} style={{ width: "100%" }}
              onTimeUpdate={(e) => setT((e.target as HTMLAudioElement).currentTime)} />
          )}
          <small style={{ color: "#71717a" }}>{scene.words.length} words · play and watch the highlight track the voice</small>
        </>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: 8, marginTop: 4, border: "1px solid #d4d4d8", borderRadius: 8 };
const btn: React.CSSProperties = { padding: "10px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", width: "fit-content" };
const pill: React.CSSProperties = { padding: "4px 10px", border: "1px solid #d4d4d8", borderRadius: 999, cursor: "pointer", fontSize: 13 };