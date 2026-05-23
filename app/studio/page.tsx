// app/studio/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Player } from "@remotion/player";
import { MainVideo, totalFrames } from "@/remotion/Video";
import Dock from "@/components/Dock";
import { LANGUAGES, voicesForLocale, defaultVoiceForLocale } from "@/lib/voices";

const InteractiveField = dynamic(() => import("@/components/InteractiveField"), { ssr: false });

const PROVIDERS = [["google", "Google (Gemini)"], ["openai", "OpenAI"], ["anthropic", "Anthropic"], ["xai", "xAI (Grok)"], ["groq", "Groq (Llama, free)"]];
const LANGS = LANGUAGES.map((l) => [l.locale, l.label] as [string, string]);
const STEPS = ["Writing script", "Generating voice", "Aligning captions", "Fetching media", "Finishing"];
const isViewable = (p: any) =>
  Array.isArray(p?.scenes) && p.scenes.length > 0 && p.scenes.every((s: any) => s.durationFrames);

export default function Studio() {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [voiceId, setVoiceId] = useState(defaultVoiceForLocale("en-US"));
  const [provider, setProvider] = useState("google");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [quality, setQuality] = useState<"quick" | "hd">("quick");
  const [aspect, setAspect] = useState<"portrait" | "landscape">("portrait");
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
  const [doneQuality, setDoneQuality] = useState<"quick" | "hd" | null>(null);
  const [renderError, setRenderError] = useState("");
  const stepTimer = useRef<any>(null);
  const pollTimer = useRef<any>(null);


  useEffect(() => {
    setProvider(localStorage.getItem("llm_provider") || "google");
    setApiKey(localStorage.getItem("llm_key") || "");
    setModel(localStorage.getItem("llm_model") || "");
    loadRecent();
    fetch("/api/warmup").catch(() => { });
    return () => { clearInterval(pollTimer.current); clearInterval(stepTimer.current); };
  }, []);
  useEffect(() => { localStorage.setItem("llm_provider", provider); }, [provider]);
  useEffect(() => { localStorage.setItem("llm_key", apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem("llm_model", model); }, [model]);

  async function loadRecent() {
    try {
      const all = await (await fetch("/api/projects")).json();
      setRecent((all || []).filter(isViewable));
    } catch { }
  }
  function selectProject(p: any) {
    clearInterval(pollTimer.current);
    setProject(p); setWarnings([]); setError(null); setRenderError("");
    setVideoUrl(p?.videoUrl || null); setRendering(false); setRenderPct(0);
    // if this project was already rendered, trust its stored quality
    setDoneQuality(p?.videoUrl ? (p?.renderQuality ?? null) : null);
  }

  async function generate() {
    setLoading(true); setError(null); setWarnings([]); selectProject(null); setStep(0);
    clearInterval(stepTimer.current);
    stepTimer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 16000);
    try {
      const res = await fetch("/api/studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, language, voiceId, provider, apiKey, model, aspect }) });      const text = await res.text();
      let data: any; try { data = JSON.parse(text); } catch { throw new Error(`Server returned non-JSON: ${text.slice(0, 80)}`); }
      if (!res.ok) { console.error(`[video-gen] ${String(data.service).toUpperCase()} error:`, data.error); setError({ service: data.service || "server", msg: data.error || "Failed" }); }
      else { (data.warnings || []).forEach((w: string) => console.warn("[video-gen]", w)); setWarnings(data.warnings || []); selectProject(data); loadRecent(); renderVideo(data.id, quality); }
    } catch (e: any) { console.error("[video-gen] network error:", e); setError({ service: "network", msg: e?.message || "Network error" }); }
    finally { clearInterval(stepTimer.current); setLoading(false); }
  }

  async function renderVideo(projectId?: string, q: "quick" | "hd" = quality) {
    const id = projectId || project?.id; if (!id) return;
    setRenderError(""); setRendering(true); setRenderPct(0); setVideoUrl(null); setDoneQuality(null); setRenderLabel(q === "hd" ? "HD" : "Quick");
    try {
      const res = await fetch(`/api/projects/${id}/render`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quality: q }) });
      const text = await res.text(); let data: any; try { data = JSON.parse(text); } catch { throw new Error(`Server returned non-JSON: ${text.slice(0, 80)}`); }
      if (!res.ok) { setRenderError(data.error || "Render failed to start"); setRendering(false); return; }
      clearInterval(pollTimer.current); let polls = 0;
      pollTimer.current = setInterval(async () => {
        polls++; if (polls > 240) { clearInterval(pollTimer.current); setRendering(false); setRenderError("Render timed out — check terminal."); return; }
        try {
          const j = await (await fetch(`/api/projects/${id}/render`)).json();
          if (j.status === "rendering") setRenderPct(j.progress || 0);
          else if (j.status === "done") { clearInterval(pollTimer.current); setRendering(false); setRenderPct(1); setVideoUrl(j.videoUrl); setDoneQuality((j.quality as "quick" | "hd") ?? q); }
          else if (j.status === "error") { clearInterval(pollTimer.current); setRendering(false); setRenderError(j.error || "Render failed"); }
          else { clearInterval(pollTimer.current); setRendering(false); setRenderError("Render job not found — retry."); }
        } catch { clearInterval(pollTimer.current); setRendering(false); setRenderError("Lost connection to render job."); }
      }, 2500);
    } catch (e: any) { setRendering(false); setRenderError(e?.message || "Network error"); }
  }

  async function clearAll() {
    if (!confirm("Delete ALL projects, audio, cached assets and rendered videos?")) return;
    const data = await (await fetch("/api/projects", { method: "DELETE" })).json();
    console.log(`[video-gen] cleared ${data.cleared} project(s)`); selectProject(null); loadRecent();
  }
  async function openRecent(id: string) { const list = await (await fetch("/api/projects")).json(); const p = list.find((x: any) => x.id === id); if (p) selectProject(p); }

  const ready = project && project.scenes?.length && project.scenes.every((s: any) => s.durationFrames);
  const landscape = (project?.aspect ?? aspect) === "landscape";
  const playerStyle: React.CSSProperties = landscape ? { width: 540, height: 304 } : { width: 300, height: 533 };

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <style>{`
          .studio-card { animation: cardIn .6s ease both; }
          @keyframes cardIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
          .field-fade { animation: fieldIn .8s ease both; }
          @keyframes fieldIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      <div className="field-fade" style={{ position: "fixed", inset: 0, zIndex: 0 }}><InteractiveField density={0.5} dotSize={0.07} opacity={0.4} radius={1.3} /></div>      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(245,239,227,0.2), rgba(245,239,227,0.8))", pointerEvents: "none" }} />
      <Dock links={[{ label: "How it works", href: "/#how" }]} cta={{ label: "← Home", href: "/" }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", padding: "170px 24px 80px" }}>
        <p style={ST.kicker}>Studio</p>
        <h1 style={ST.h1}>Create a video</h1>
        <p style={ST.sub}>Type a topic. Get a finished, voiced, captioned video — in one click.</p>

        <div style={ST.card} className="studio-card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="LLM provider (BYOK)"><select value={provider} onChange={(e) => setProvider(e.target.value)} style={ST.inp}>{PROVIDERS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Field>
            <Field label="Model (optional)"><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="default" style={ST.inp} /></Field>
          </div>
          <Field label="Your LLM API key (stays in your browser)"><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API key" style={ST.inp} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <Field label="Topic"><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How black holes work" style={ST.inp} /></Field>
            <Field label="Language"><select value={language} onChange={(e) => { const loc = e.target.value; setLanguage(loc); setVoiceId(defaultVoiceForLocale(loc)); }} style={ST.inp}>{LANGS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Field>
          </div>
          <Field label="Voice"><select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} style={ST.inp}>{voicesForLocale(language).map((v) => <option key={v.voiceId} value={v.voiceId}>{v.name}</option>)}</select></Field>
          <Field label="Format">
            <div style={{ display: "flex", gap: 10 }}>
              {(["portrait", "landscape"] as const).map((a) => <button key={a} onClick={() => setAspect(a)} style={{ ...ST.toggle, ...(aspect === a ? ST.toggleOn : {}) }}>{a === "portrait" ? "📱 Portrait 9:16" : "🖥️ Landscape 16:9"}</button>)}
            </div>
          </Field>
          <Field label="Render quality">
            <div style={{ display: "flex", gap: 10 }}>
              {(["quick", "hd"] as const).map((q) => <button key={q} onClick={() => setQuality(q)} style={{ ...ST.toggle, ...(quality === q ? ST.toggleOn : {}) }}>{q === "quick" ? "⚡ Quick" : "💎 HD"}</button>)}
            </div>
          </Field>
          <button onClick={generate} disabled={loading || !topic.trim()} style={{ ...ST.btn, opacity: loading || !topic.trim() ? 0.55 : 1 }}>{loading ? "Generating… (~1–2 min)" : "✨ Generate video"}</button>

          {loading && <div style={ST.steps}>{STEPS.map((s, i) => <div key={i} style={{ color: i < step ? "var(--accent-2)" : i === step ? "var(--ink)" : "#b8ad9c" }}>{i < step ? "✓" : i === step ? "●" : "○"} {s}</div>)}</div>}
          {error && <div style={ST.error}><strong>❌ {error.service.toUpperCase()} failed</strong><div style={{ marginTop: 6, fontSize: 13 }}>{error.msg}</div></div>}
          {warnings.length > 0 && <div style={ST.warn}>{warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <select onChange={(e) => e.target.value && openRecent(e.target.value)} value="" style={{ ...ST.inp, flex: 1 }}><option value="">Recent projects…</option>{recent.map((p) => <option key={p.id} value={p.id}>{p.topic} ({p.aspect || "portrait"})</option>)}</select>
            <button onClick={clearAll} style={ST.clear}>🗑</button>
          </div>
        </div>

        {ready && (
          <div style={ST.result}>
            <Player component={MainVideo} acknowledgeRemotionLicense inputProps={{ project }} durationInFrames={totalFrames(project)} fps={project.fps}
              compositionWidth={landscape ? 1920 : 1080} compositionHeight={landscape ? 1080 : 1920} controls
              style={{ ...playerStyle, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(120,90,60,0.25)" }} />
            <div style={{ width: landscape ? 540 : 300, maxWidth: "100%", display: "grid", gap: 8 }}>
              {rendering ? (
                <div><div style={{ fontSize: 14, marginBottom: 6 }}>{renderPct > 0 ? `Rendering ${renderLabel}… ${Math.round(renderPct * 100)}%` : "Preparing…"}</div><div style={ST.barOuter}><div style={{ ...ST.barInner, width: `${Math.max(4, renderPct * 100)}%` }} /></div></div>
              ) : videoUrl ? (
                <>
                  <div style={ST.qualityTag}>{doneQuality === "hd" ? "💎 HD video ready" : "⚡ Quick video ready"}</div>
                  <a href={videoUrl} download={`${project.id}.mp4`} style={{ ...ST.download, textAlign: "center" }}>⬇ Download MP4</a>
                  {doneQuality === "hd" ? (
                    <button disabled style={{ ...ST.secondary, ...ST.secondaryDone }}>✓ Already top quality (HD)</button>
                  ) : (
                    <button onClick={() => renderVideo(project.id, "hd")} style={ST.secondary}>💎 Re-render in HD</button>
                  )}
                </>
              ) : (
                <button onClick={() => renderVideo(project.id, quality)} style={ST.download}>🎬 Render &amp; download</button>
              )}
              {renderError && <div style={ST.error}>❌ {renderError}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: "grid", gap: 5 }}><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{label}</span>{children}</label>
);

const ST: Record<string, React.CSSProperties> = {
  kicker: { color: "var(--accent)", fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" },
  h1: { fontSize: "clamp(30px,4vw,44px)", fontWeight: 800, textAlign: "center", margin: "10px 0 8px", letterSpacing: "-0.025em" },
  sub: { color: "var(--muted)", textAlign: "center", marginBottom: 30, fontSize: 16 },
  card: { background: "#ffffff", border: "1px solid #e0d4bd", borderRadius: 24, padding: 28, display: "grid", gap: 16, boxShadow: "0 30px 80px rgba(120,90,60,0.16), 0 2px 0 rgba(255,255,255,0.9) inset" },
  inp: { width: "100%", padding: 12, background: "#faf6ee", border: "1.5px solid #e0d4bd", borderRadius: 12, color: "var(--ink)", fontSize: 14 },
  toggle: { flex: 1, padding: "12px", background: "#faf6ee", border: "1.5px solid #e0d4bd", borderRadius: 12, color: "var(--muted)", cursor: "pointer", fontSize: 14, fontWeight: 500 },
  toggleOn: { background: "rgba(229,83,43,0.10)", border: "1.5px solid var(--accent)", color: "var(--ink)", fontWeight: 600 },
  btn: { padding: "15px 18px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 14, cursor: "pointer", fontWeight: 700, fontSize: 16, boxShadow: "0 12px 30px rgba(229,83,43,0.30)" },
  steps: { background: "#faf6ee", border: "1px solid #e0d4bd", borderRadius: 14, padding: 16, display: "grid", gap: 6, fontSize: 14 },
  error: { background: "#fae6e0", border: "1px solid #e8a594", color: "#9c3418", borderRadius: 12, padding: 14 },
  warn: { background: "#f7eccf", border: "1px solid #ddc079", color: "#7a5a18", borderRadius: 12, padding: 12, fontSize: 13, display: "grid", gap: 4 },
  clear: { padding: "12px 16px", background: "#faf6ee", color: "var(--accent)", border: "1.5px solid #e0d4bd", borderRadius: 12, cursor: "pointer" },
  result: { marginTop: 30, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" },
  qualityTag: { textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--accent-2)" },
  download: { padding: "13px 16px", background: "var(--accent-2)", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, textDecoration: "none", display: "block" },
  secondary: { padding: "11px 16px", background: "#faf6ee", color: "var(--ink)", border: "1.5px solid #e0d4bd", borderRadius: 12, cursor: "pointer", fontWeight: 600 },
  secondaryDone: { opacity: 0.7, cursor: "default", color: "var(--muted)" },
  barOuter: { height: 10, background: "var(--bg-2)", borderRadius: 99, overflow: "hidden" },
  barInner: { height: "100%", background: "var(--accent)", transition: "width .4s" },
};