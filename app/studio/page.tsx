// app/studio/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { MainVideo, totalFrames } from "@/remotion/Video";

const PROVIDERS = [["google", "Google (Gemini)"], ["openai", "OpenAI"], ["anthropic", "Anthropic"], ["xai", "xAI (Grok)"]];
const LANGS = [["en-US", "English"], ["hi-IN", "Hindi"], ["es-ES", "Spanish"], ["fr-FR", "French"]];
const STEPS = ["Writing script", "Generating voice", "Aligning captions", "Fetching media", "Finishing"];

export default function Studio() {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [provider, setProvider] = useState("google");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [quality, setQuality] = useState<"quick" | "hd">("quick");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<{ service: string; msg: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [rendering, setRendering] = useState(false);
  const [renderPct, setRenderPct] = useState(0);
  const [renderLabel, setRenderLabel] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState("");
  const stepTimer = useRef<any>(null);
  const pollTimer = useRef<any>(null);

  useEffect(() => {
    setProvider(localStorage.getItem("llm_provider") || "google");
    setApiKey(localStorage.getItem("llm_key") || "");
    setModel(localStorage.getItem("llm_model") || "");
    loadRecent();
    fetch("/api/warmup").catch(() => {}); // warm browser + bundle so first render is quick
    return () => { clearInterval(pollTimer.current); clearInterval(stepTimer.current); };
  }, []);
  useEffect(() => { localStorage.setItem("llm_provider", provider); }, [provider]);
  useEffect(() => { localStorage.setItem("llm_key", apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem("llm_model", model); }, [model]);

  async function loadRecent() {
    try { setRecent(await (await fetch("/api/projects")).json()); } catch {}
  }

  function selectProject(p: any) {
    clearInterval(pollTimer.current);
    setProject(p); setWarnings([]); setError(null); setRenderError("");
    setVideoUrl(p?.videoUrl || null); setRendering(false); setRenderPct(0);
  }

  async function generate() {
    setLoading(true); setError(null); setWarnings([]); selectProject(null); setStep(0);
    clearInterval(stepTimer.current);
    stepTimer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 16000);
    try {
      const res = await fetch("/api/studio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, language, provider, apiKey, model }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Server returned non-JSON: ${text.slice(0, 80)}`); }
      if (!res.ok) {
        console.error(`[video-gen] ${String(data.service).toUpperCase()} error:`, data.error);
        setError({ service: data.service || "server", msg: data.error || "Failed" });
      } else {
        (data.warnings || []).forEach((w: string) => console.warn("[video-gen]", w));
        setWarnings(data.warnings || []);
        selectProject(data);
        loadRecent();
        renderVideo(data.id, quality);          // 🚀 auto-render in background
      }
    } catch (e: any) {
      console.error("[video-gen] network error:", e);
      setError({ service: "network", msg: e?.message || "Network error" });
    } finally {
      clearInterval(stepTimer.current); setLoading(false);
    }
  }

  async function renderVideo(projectId?: string, q: "quick" | "hd" = quality) {
    const id = projectId || project?.id;
    if (!id) return;
    setRenderError(""); setRendering(true); setRenderPct(0); setVideoUrl(null);
    setRenderLabel(q === "hd" ? "HD" : "Quick");
    try {
      const res = await fetch(`/api/projects/${id}/render`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality: q }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Server returned non-JSON: ${text.slice(0, 80)}`); }
      if (!res.ok) { setRenderError(data.error || "Render failed to start"); setRendering(false); return; }

      clearInterval(pollTimer.current);
      let polls = 0;
      pollTimer.current = setInterval(async () => {
        polls++;
        if (polls > 240) { clearInterval(pollTimer.current); setRendering(false); setRenderError("Render timed out — check the terminal."); return; }
        try {
          const j = await (await fetch(`/api/projects/${id}/render`)).json();
          if (j.status === "rendering") { setRenderPct(j.progress || 0); }
          else if (j.status === "done") {
            clearInterval(pollTimer.current); setRendering(false); setRenderPct(1); setVideoUrl(j.videoUrl);
            console.log("[video-gen] render done:", j.videoUrl);
          } else if (j.status === "error") {
            clearInterval(pollTimer.current); setRendering(false);
            console.error("[video-gen] render error:", j.error); setRenderError(j.error || "Render failed");
          } else {
            clearInterval(pollTimer.current); setRendering(false); setRenderError("Render job not found — retry.");
          }
        } catch {
          clearInterval(pollTimer.current); setRendering(false); setRenderError("Lost connection to render job.");
        }
      }, 2500);
    } catch (e: any) {
      setRendering(false); setRenderError(e?.message || "Network error");
    }
  }

  async function clearAll() {
    if (!confirm("Delete ALL projects, audio, cached assets and rendered videos?")) return;
    const data = await (await fetch("/api/projects", { method: "DELETE" })).json();
    console.log(`[video-gen] cleared ${data.cleared} project(s)`);
    selectProject(null); loadRecent();
  }

  async function openRecent(id: string) {
    const list = await (await fetch("/api/projects")).json();
    const p = list.find((x: any) => x.id === id);
    if (p) selectProject(p);
  }

  const ready = project && project.scenes?.length && project.scenes.every((s: any) => s.durationFrames);

  return (
    <div style={ST.page}>
      <div style={ST.shell}>
        <div style={ST.panel}>
          <h1 style={ST.h1}>🎬 One-Click Video</h1>
          <p style={ST.sub}>Type a topic. Get a finished, voiced, captioned video.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="LLM provider (BYOK)">
              <select value={provider} onChange={(e) => setProvider(e.target.value)} style={ST.inp}>
                {PROVIDERS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
              </select>
            </Field>
            <Field label="Model (optional)"><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="default" style={ST.inp} /></Field>
          </div>

          <Field label="Your LLM API key (stays in your browser)">
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="paste your Gemini key" style={ST.inp} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <Field label="Topic"><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How black holes work" style={ST.inp} /></Field>
            <Field label="Language">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={ST.inp}>
                {LANGS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Render quality">
            <div style={{ display: "flex", gap: 8 }}>
              {(["quick", "hd"] as const).map((q) => (
                <button key={q} onClick={() => setQuality(q)}
                  style={{ ...ST.toggle, ...(quality === q ? ST.toggleOn : {}) }}>
                  {q === "quick" ? "⚡ Quick (720p, fast)" : "💎 HD (1080p)"}
                </button>
              ))}
            </div>
          </Field>

          <button onClick={generate} disabled={loading || !topic.trim()} style={{ ...ST.btn, opacity: loading || !topic.trim() ? 0.6 : 1 }}>
            {loading ? "Generating… (~1–2 min)" : "✨ Generate video"}
          </button>

          {loading && (
            <div style={ST.steps}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ color: i < step ? "#7CFFC4" : i === step ? "#fff" : "#6b6b76" }}>
                  {i < step ? "✓" : i === step ? "●" : "○"} {s}
                </div>
              ))}
              <small style={{ color: "#6b6b76" }}>Watch the terminal for live API + render logs.</small>
            </div>
          )}

          {error && (
            <div style={ST.error}>
              <strong>❌ {error.service.toUpperCase()} failed</strong>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>{error.msg}</div>
            </div>
          )}
          {warnings.length > 0 && <div style={ST.warn}>{warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}</div>}

          <div style={ST.recentBar}>
            <select onChange={(e) => e.target.value && openRecent(e.target.value)} value="" style={{ ...ST.inp, flex: 1 }}>
              <option value="">Recent projects…</option>
              {recent.map((p) => <option key={p.id} value={p.id}>{p.topic} ({p.status})</option>)}
            </select>
            <button onClick={clearAll} style={ST.clear}>🗑 Clear all</button>
          </div>
        </div>

        <div style={ST.stage}>
          {ready ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              <Player
                component={MainVideo}
                acknowledgeRemotionLicense
                inputProps={{ project }}
                durationInFrames={totalFrames(project)}
                fps={project.fps}
                compositionWidth={1080}
                compositionHeight={1920}
                controls
                style={{ width: 320, height: 569, borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.5)" }}
              />
              <div style={{ width: 320, display: "grid", gap: 8 }}>
                {rendering ? (
                  <div>
                    <div style={{ fontSize: 14, marginBottom: 6 }}>{renderPct > 0 ? `Rendering ${renderLabel}… ${Math.round(renderPct * 100)}%` : "Preparing renderer…"}</div>
                    <div style={ST.barOuter}><div style={{ ...ST.barInner, width: `${Math.max(4, renderPct * 100)}%` }} /></div>
                    <small style={{ color: "#6b6b76" }}>First render of a session downloads a headless browser once.</small>
                  </div>
                ) : videoUrl ? (
                  <>
                    <a href={videoUrl} download={`${project.id}.mp4`} style={{ ...ST.download, textAlign: "center", textDecoration: "none" }}>⬇ Download MP4</a>
                    <button onClick={() => renderVideo(project.id, "hd")} style={ST.secondaryWide}>💎 Re-render in HD</button>
                  </>
                ) : (
                  <button onClick={() => renderVideo(project.id, quality)} style={ST.download}>🎬 Render &amp; download</button>
                )}
                {renderError && <div style={ST.error}>❌ {renderError}</div>}
              </div>
            </div>
          ) : (
            <div style={ST.placeholder}>{loading ? "Building your video…" : "Your video preview will appear here"}</div>
          )}
        </div>
      </div>
    </div>
  );
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#9a9aa3" }}>{label}</span>{children}</label>
);

const ST: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#09090b", color: "#fafaf7", fontFamily: "system-ui", padding: 32 },
  shell: { maxWidth: 1040, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start" },
  panel: { background: "#131316", border: "1px solid #232329", borderRadius: 18, padding: 24, display: "grid", gap: 14 },
  h1: { fontSize: 26, fontWeight: 800, margin: 0 },
  sub: { color: "#9a9aa3", marginTop: -8, fontSize: 14 },
  inp: { width: "100%", padding: 10, background: "#0c0c0f", border: "1px solid #2a2a31", borderRadius: 10, color: "#fafaf7" },
  toggle: { flex: 1, padding: "10px", background: "#0c0c0f", border: "1px solid #2a2a31", borderRadius: 10, color: "#9a9aa3", cursor: "pointer", fontSize: 13 },
  toggleOn: { background: "#1c1c22", border: "1px solid #FF5C38", color: "#fff" },
  btn: { padding: "14px 18px", background: "#FF5C38", color: "#111", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 16 },
  steps: { background: "#0c0c0f", border: "1px solid #232329", borderRadius: 12, padding: 14, display: "grid", gap: 6, fontSize: 14 },
  error: { background: "#2a0f0f", border: "1px solid #5e1f1f", color: "#ffb4b4", borderRadius: 12, padding: 14 },
  warn: { background: "#241d05", border: "1px solid #5a4a10", color: "#ffe39a", borderRadius: 12, padding: 12, fontSize: 13, display: "grid", gap: 4 },
  recentBar: { display: "flex", gap: 8, marginTop: 4 },
  clear: { padding: "10px 12px", background: "#1c1c22", color: "#ff9b9b", border: "1px solid #3a2a2a", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap" },
  stage: { display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: 569 },
  placeholder: { width: 320, height: 569, borderRadius: 18, border: "1px dashed #2a2a31", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b6b76", textAlign: "center", padding: 20 },
  download: { padding: "12px 16px", background: "#7CFFC4", color: "#08130d", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, display: "inline-block" },
  secondaryWide: { padding: "10px 16px", background: "#1c1c22", color: "#fff", border: "1px solid #2a2a31", borderRadius: 10, cursor: "pointer" },
  barOuter: { height: 10, background: "#1c1c22", borderRadius: 99, overflow: "hidden" },
  barInner: { height: "100%", background: "#FF5C38", transition: "width .4s" },
};