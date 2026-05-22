// app/voice/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function VoicePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [id, setId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then((list) => {
      setProjects(list);
      if (list[0]) setId(list[0].id);
    });
  }, []);

  async function voice() {
    setLoading(true); setError(""); setResult(null);
    const res = await fetch(`/api/projects/${id}/voice`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setError(data.error); else setResult(data);
    setLoading(false);
  }

  const fps = result?.fps ?? 30;
  const totalFrames = result?.scenes?.reduce((a: number, s: any) => a + (s.durationFrames || 0), 0) ?? 0;

  return (
    <div style={{ maxWidth: 720, margin: "48px auto", fontFamily: "system-ui", display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Voiceover test</h1>

      <label>Project (generate one at /generate first)
        <select value={id} onChange={(e) => setId(e.target.value)} style={inp}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.topic} — {p.scenes.length} scenes</option>)}
        </select>
      </label>

      <button onClick={voice} disabled={loading || !id} style={btn}>
        {loading ? "Generating voice with Falcon..." : "Generate voiceover"}
      </button>

      {error && <p style={{ color: "#dc2626" }}>❌ {error}</p>}

      {result && (
        <div style={{ display: "grid", gap: 8 }}>
          <p><strong>Total length:</strong> {(totalFrames / fps).toFixed(1)}s ({totalFrames} frames @ {fps}fps)</p>
          {result.masterUrl && (
            <div>
              <small style={{ color: "#71717a" }}>Full narration:</small>
              <audio controls src={result.masterUrl} style={{ width: "100%" }} />
            </div>
          )}
          {result.scenes.map((s: any, i: number) => (
            <div key={s.id} style={card}>
              <small style={{ color: "#71717a" }}>#{i + 1} · {((s.durationFrames || 0) / fps).toFixed(2)}s</small>
              <div style={{ fontSize: 14 }}>{s.narration}</div>
              {s.audioUrl && <audio controls src={s.audioUrl} style={{ width: "100%", marginTop: 6 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: 8, marginTop: 4, border: "1px solid #d4d4d8", borderRadius: 8 };
const btn: React.CSSProperties = { padding: "10px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", width: "fit-content" };
const card: React.CSSProperties = { padding: 10, border: "1px solid #e4e4e7", borderRadius: 8, background: "#fff" };