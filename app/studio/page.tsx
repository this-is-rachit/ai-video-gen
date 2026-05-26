// app/studio/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Player } from "@remotion/player";
import { MainVideo, totalFrames } from "@/remotion/Video";
import Dock from "@/components/Dock";
import { useRenderJob } from "@/components/useRenderJob";
import { LANGUAGES, voicesForLocale, defaultVoiceForLocale } from "@/lib/voices";
const InteractiveField = dynamic(() => import("@/components/InteractiveField"), { ssr: false });
const PROVIDERS = [["google", "Google (Gemini)"], ["openai", "OpenAI"], ["anthropic", "Anthropic"], ["xai", "xAI (Grok)"], ["groq", "Groq (Llama, free)"]];
const LANGS = LANGUAGES.map((l) => [l.locale, l.label] as [string, string]);
const STEPS = ["Writing script", "Generating voice", "Aligning captions", "Fetching media", "Finishing"];
const DURATIONS: { secs: number; label: string; hint: string }[] = [
  { secs: 60, label: "~1 min", hint: "Fastest" },
  { secs: 120, label: "~2 min", hint: "Balanced" },
  { secs: 180, label: "~3 min", hint: "In-depth" },
  { secs: 300, label: "~5 min", hint: "Longest" },
];
const isViewable = (p: any) =>
  Array.isArray(p?.scenes) && p.scenes.length > 0 && p.scenes.every((s: any) => s.durationFrames);
export default function Studio() {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [voiceId, setVoiceId] = useState(defaultVoiceForLocale("en-US"));
  const [provider, setProvider] = useState("google");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [remember, setRemember] = useState(false);
  const [quality, setQuality] = useState<"quick" | "hd">("quick");
  const [aspect, setAspect] = useState<"portrait" | "landscape">("portrait");
  const [duration, setDuration] = useState(120);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<{ service: string; msg: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const render = useRenderJob();
  const stepTimer = useRef<any>(null);
  const loaded = useRef(false);
  useEffect(() => {
    const rememberPref = localStorage.getItem("llm_remember") === "1";
    setRemember(rememberPref);
    const store = rememberPref ? localStorage : sessionStorage;
    setProvider(store.getItem("llm_provider") || "google");
    setApiKey(store.getItem("llm_key") || "");
    setModel(store.getItem("llm_model") || "");
    loaded.current = true;
    loadRecent();
    fetch("/api/warmup").catch(() => { });
    return () => { render.stop(); clearInterval(stepTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem("llm_remember", remember ? "1" : "0");
    const active = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    active.setItem("llm_provider", provider);
    active.setItem("llm_key", apiKey);
    active.setItem("llm_model", model);
    other.removeItem("llm_provider");
    other.removeItem("llm_key");
    other.removeItem("llm_model");
  }, [provider, apiKey, model, remember]);
  async function loadRecent() {
    try {
      const all = await (await fetch("/api/projects")).json();
      setRecent((all || []).filter(isViewable));
    } catch { }
  }
  function selectProject(p: any) {
    render.stop();
    setProject(p); setWarnings([]); setError(null);
    render.reset(p?.videoUrl || null, p?.renderQuality ?? null);
  }
  async function generate() {
    setLoading(true); setError(null); setWarnings([]); selectProject(null); setStep(0);
    clearInterval(stepTimer.current);
    stepTimer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 16000);
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, language, voiceId, provider, apiKey, model, aspect, targetSeconds: duration }),
      });
      const text = await res.text();
      let data: any; try { data = JSON.parse(text); } catch { throw new Error(`Server returned non-JSON: ${text.slice(0, 80)}`); }
      if (!res.ok) { console.error(`[video-gen] ${String(data.service).toUpperCase()} error:`, data.error); setError({ service: data.service || "server", msg: data.error || "Failed" }); }
      else { (data.warnings || []).forEach((w: string) => console.warn("[video-gen]", w)); setWarnings(data.warnings || []); selectProject(data); loadRecent(); render.startRender(data.id, quality); }
    } catch (e: any) { console.error("[video-gen] network error:", e); setError({ service: "network", msg: e?.message || "Network error" }); }
    finally { clearInterval(stepTimer.current); setLoading(false); }
  }
  async function clearAll() {
    if (!confirm("Delete ALL projects, audio, cached assets and rendered videos?")) return;
    const data = await (await fetch("/api/projects", { method: "DELETE" })).json();
    console.log(`[video-gen] cleared ${data.cleared} project(s)`); selectProject(null); loadRecent();
  }
  async function openRecent(id: string) { const list = await (await fetch("/api/projects")).json(); const p = list.find((x: any) => x.id === id); if (p) selectProject(p); }
  const ready = project && project.scenes?.length && project.scenes.every((s: any) => s.durationFrames);
  const landscape = (project?.aspect ?? aspect) === "landscape";
  const playerStyle: React.CSSProperties = landscape ? { width: "100%", maxWidth: 500, aspectRatio: "16 / 9" } : { width: "100%", maxWidth: 320, aspectRatio: "9 / 16" };
  const softError = !!error && (error.service === "ratelimit" || /budget/i.test(error.msg));
  const errorTitle = error
    ? error.service === "ratelimit" ? "⏳ Too many requests"
      : /budget/i.test(error.msg) ? "💛 Voice budget reached"
      : `❌ ${error.service.toUpperCase()} failed`
    : "";
  const softRenderError = /too many|wait about/i.test(render.renderError);
  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <style>{`
          .studio-card { animation: cardIn .6s ease both; }
          @keyframes cardIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
          .field-fade { animation: fieldIn .8s ease both; }
          @keyframes fieldIn { from { opacity: 0; } to { opacity: 1; } }
          .studio-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(380px,520px); gap: 28px; align-items: start; }
          .studio-preview { position: sticky; top: 110px; }
          @media (max-width: 920px) {
            .studio-grid { grid-template-columns: 1fr; }
            .studio-preview { position: static; }
          }
        `}</style>
      <div className="field-fade" style={{ position: "fixed", inset: 0, zIndex: 0 }}><InteractiveField density={0.5} dotSize={0.07} opacity={0.4} radius={1.3} /></div>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(245,239,227,0.2), rgba(245,239,227,0.8))", pointerEvents: "none" }} />
      <Dock links={[{ label: "How it works", href: "/#how" }]} cta={{ label: "← Home", href: "/" }} />
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1240, margin: "0 auto", padding: "150px 24px 80px" }}>
        <p style={ST.kicker}>Studio</p>
        <h1 style={ST.h1}>Create a video</h1>
        <p style={ST.sub}>Type a topic. Get a finished, voiced, captioned video — in one click.</p>
        <div className="studio-grid">
          {/* LEFT — controls */}
          <div style={ST.card} className="studio-card">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="LLM provider (BYOK)"><select value={provider} onChange={(e) => setProvider(e.target.value)} style={ST.inp}>{PROVIDERS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Field>
              <Field label="Model (optional)"><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="default" style={ST.inp} /></Field>
            </div>
            <Field label="Your LLM API key">
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API key" style={ST.inp} />
              <label style={ST.rememberRow}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} />
                <span>Remember on this device</span>
              </label>
              <p style={ST.disclosure}>
                Bring your own key. It’s sent only to your chosen AI provider through this app to write the script, and is never stored on our servers. {remember ? "Saved in this browser until you clear it." : "Kept only until you close this tab."}
              </p>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <Field label="Topic"><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How black holes work" style={ST.inp} /></Field>
              <Field label="Language"><select value={language} onChange={(e) => { const loc = e.target.value; setLanguage(loc); setVoiceId(defaultVoiceForLocale(loc)); }} style={ST.inp}>{LANGS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Field>
            </div>
            <Field label="Voice"><select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} style={ST.inp}>{voicesForLocale(language).map((v) => <option key={v.voiceId} value={v.voiceId}>{v.name}</option>)}</select></Field>
            <Field label="Length">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {DURATIONS.map((d) => (
                  <button key={d.secs} onClick={() => setDuration(d.secs)} style={{ ...ST.durBtn, ...(duration === d.secs ? ST.toggleOn : {}) }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{d.label}</span>
                    <span style={{ fontSize: 11, color: duration === d.secs ? "var(--ink)" : "var(--muted)" }}>{d.hint}</span>
                  </button>
                ))}
              </div>
              {duration >= 180 && <p style={ST.durNote}>Longer videos take noticeably longer to render — especially in HD.</p>}
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Format">
                <div style={{ display: "flex", gap: 8 }}>
                  {(["portrait", "landscape"] as const).map((a) => <button key={a} onClick={() => setAspect(a)} style={{ ...ST.toggle, ...(aspect === a ? ST.toggleOn : {}) }}>{a === "portrait" ? "📱 9:16" : "🖥️ 16:9"}</button>)}
                </div>
              </Field>
              <Field label="Render quality">
                <div style={{ display: "flex", gap: 8 }}>
                  {(["quick", "hd"] as const).map((q) => <button key={q} onClick={() => setQuality(q)} style={{ ...ST.toggle, ...(quality === q ? ST.toggleOn : {}) }}>{q === "quick" ? "⚡ Quick" : "💎 HD"}</button>)}
                </div>
              </Field>
            </div>
            <button onClick={generate} disabled={loading || !topic.trim()} style={{ ...ST.btn, opacity: loading || !topic.trim() ? 0.55 : 1 }}>{loading ? "Generating… (~1–2 min)" : "✨ Generate video"}</button>
            {loading && <div style={ST.steps}>{STEPS.map((s, i) => <div key={i} style={{ color: i < step ? "var(--accent-2)" : i === step ? "var(--ink)" : "#b8ad9c" }}>{i < step ? "✓" : i === step ? "●" : "○"} {s}</div>)}</div>}
            {error && <div style={softError ? ST.softNotice : ST.error}><strong>{errorTitle}</strong><div style={{ marginTop: 6, fontSize: 13 }}>{error.msg}</div></div>}
            {warnings.length > 0 && <div style={ST.warn}>{warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <select onChange={(e) => e.target.value && openRecent(e.target.value)} value="" style={{ ...ST.inp, flex: 1 }}><option value="">Recent projects…</option>{recent.map((p) => <option key={p.id} value={p.id}>{p.topic} ({p.aspect || "portrait"})</option>)}</select>
              <button onClick={clearAll} style={ST.clear}>🗑</button>
            </div>
          </div>
          {/* RIGHT — sticky preview */}
          <div className="studio-preview">
            <div style={ST.previewPanel}>
              {ready ? (
                <div style={{ display: "grid", gap: 14, justifyItems: "center", width: "100%" }}>
                  <Player component={MainVideo} acknowledgeRemotionLicense inputProps={{ project }} durationInFrames={totalFrames(project)} fps={project.fps}
                    compositionWidth={landscape ? 1920 : 1080} compositionHeight={landscape ? 1080 : 1920} controls
                    style={{ ...playerStyle, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(120,90,60,0.25)" }} />
                  <div style={{ width: "100%", maxWidth: landscape ? 500 : 320, display: "grid", gap: 8 }}>
                    {render.rendering ? (
                      <div><div style={{ fontSize: 14, marginBottom: 6 }}>{render.queuePos > 0 ? `In queue — ${render.queuePos} render${render.queuePos > 1 ? "s" : ""} ahead…` : render.renderPct > 0 ? `Rendering ${render.renderLabel}… ${Math.round(render.renderPct * 100)}%` : "Preparing…"}</div><div style={ST.barOuter}><div style={{ ...ST.barInner, width: `${Math.max(4, render.renderPct * 100)}%` }} /></div></div>
                    ) : render.videoUrl ? (
                      <>
                        <div style={ST.qualityTag}>{render.doneQuality === "hd" ? "💎 HD video ready" : "⚡ Quick video ready"}</div>
                        <a href={render.videoUrl} download={`${project.id}.mp4`} style={{ ...ST.download, textAlign: "center" }}>⬇ Download MP4</a>
                        {render.doneQuality === "hd" ? (
                          <button disabled style={{ ...ST.secondary, ...ST.secondaryDone }}>✓ Already top quality (HD)</button>
                        ) : (
                          <button onClick={() => render.startRender(project.id, "hd")} style={ST.secondary}>💎 Re-render in HD</button>
                        )}
                      </>
                    ) : (
                      <button onClick={() => render.startRender(project.id, quality)} style={ST.download}>🎬 Render &amp; download</button>
                    )}
                    {render.renderError && <div style={softRenderError ? ST.softNotice : ST.error}>{softRenderError ? "⏳ " : "❌ "}{render.renderError}</div>}
                    <Link href={`/studio/edit/${project.id}`} style={{ ...ST.editLink, textAlign: "center" }}>✏️ Edit this video</Link>
                  </div>
                </div>
              ) : (
                <div style={ST.previewEmpty}>
                  <div style={{ fontSize: 34, opacity: 0.5 }}>🎬</div>
                  <p style={{ fontWeight: 700, marginTop: 12, fontSize: 16 }}>Your preview appears here</p>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.55 }}>Fill in a topic and hit Generate. The video plays here the moment it’s ready — then you can fine-tune every scene in the editor.</p>
                </div>
              )}
            </div>
          </div>
        </div>
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
  rememberRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "var(--ink)", fontWeight: 500, cursor: "pointer" },
  disclosure: { fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, marginTop: 6 },
  toggle: { flex: 1, padding: "12px", background: "#faf6ee", border: "1.5px solid #e0d4bd", borderRadius: 12, color: "var(--muted)", cursor: "pointer", fontSize: 14, fontWeight: 500 },
  toggleOn: { background: "rgba(229,83,43,0.10)", border: "1.5px solid var(--accent)", color: "var(--ink)", fontWeight: 600 },
  durBtn: { display: "grid", gap: 2, padding: "10px 6px", background: "#faf6ee", border: "1.5px solid #e0d4bd", borderRadius: 12, color: "var(--muted)", cursor: "pointer", textAlign: "center" },
  durNote: { fontSize: 11.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 },
  btn: { padding: "15px 18px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 14, cursor: "pointer", fontWeight: 700, fontSize: 16, boxShadow: "0 12px 30px rgba(229,83,43,0.30)" },
  steps: { background: "#faf6ee", border: "1px solid #e0d4bd", borderRadius: 14, padding: 16, display: "grid", gap: 6, fontSize: 14 },
  error: { background: "#fae6e0", border: "1px solid #e8a594", color: "#9c3418", borderRadius: 12, padding: 14 },
  softNotice: { background: "#fbf1dc", border: "1px solid #e8c98a", color: "#8a5a12", borderRadius: 12, padding: 14, fontSize: 13 },
  warn: { background: "#f7eccf", border: "1px solid #ddc079", color: "#7a5a18", borderRadius: 12, padding: 12, fontSize: 13, display: "grid", gap: 4 },
  clear: { padding: "12px 16px", background: "#faf6ee", color: "var(--accent)", border: "1.5px solid #e0d4bd", borderRadius: 12, cursor: "pointer" },
  previewPanel: { background: "rgba(255,255,255,0.72)", backdropFilter: "blur(10px)", border: "1px solid #e0d4bd", borderRadius: 24, padding: "26px 22px", minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 30px 80px rgba(120,90,60,0.12)" },
  previewEmpty: { textAlign: "center", maxWidth: 300, padding: "30px 10px" },
  qualityTag: { textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--accent-2)" },
  download: { padding: "13px 16px", background: "var(--accent-2)", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, textDecoration: "none", display: "block" },
  secondary: { padding: "11px 16px", background: "#faf6ee", color: "var(--ink)", border: "1.5px solid #e0d4bd", borderRadius: 12, cursor: "pointer", fontWeight: 600 },
  secondaryDone: { opacity: 0.7, cursor: "default", color: "var(--muted)" },
  editLink: { padding: "12px 16px", background: "transparent", color: "var(--accent)", border: "1.5px solid var(--accent)", borderRadius: 12, cursor: "pointer", fontWeight: 700, textDecoration: "none", display: "block" },
  barOuter: { height: 10, background: "var(--bg-2)", borderRadius: 99, overflow: "hidden" },
  barInner: { height: "100%", background: "var(--accent)", transition: "width .4s" },
};