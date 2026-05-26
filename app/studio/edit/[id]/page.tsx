// app/studio/edit/[id]/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Player } from "@remotion/player";
import { MainVideo, totalFrames } from "@/remotion/Video";
import Dock from "@/components/Dock";
import { useRenderJob } from "@/components/useRenderJob";
// Renderer-consumed text fields per template (what's safe + meaningful to edit).
const SCENE_FIELDS: Record<string, { key: string; label: string; list?: boolean }[]> = {
  title_card: [{ key: "title", label: "Title" }, { key: "subtitle", label: "Subtitle" }],
  bullet_reveal: [{ key: "title", label: "Title" }, { key: "bullets", label: "Bullets (one per line)", list: true }],
  image_caption: [{ key: "caption", label: "Caption" }],
  b_roll: [{ key: "caption", label: "Caption" }],
  big_number: [{ key: "value", label: "Value" }, { key: "caption", label: "Caption" }],
  quote: [{ key: "quote", label: "Quote" }, { key: "attribution", label: "Attribution" }],
  whiteboard: [{ key: "title", label: "Title" }, { key: "bullets", label: "Bullets (one per line)", list: true }],
  outro: [{ key: "title", label: "Title" }, { key: "subtitle", label: "Subtitle" }],
  montage: [{ key: "caption", label: "Caption" }],
  comparison: [{ key: "leftLabel", label: "Left label" }, { key: "rightLabel", label: "Right label" }],
};
const editableSig = (scenes: any[]) => JSON.stringify((scenes || []).map((s) => ({
  id: s.id, n: s.narration,
  v: { title: s.visual.title, subtitle: s.visual.subtitle, bullets: s.visual.bullets, value: s.visual.value, caption: s.visual.caption, quote: s.visual.quote, attribution: s.visual.attribution, leftLabel: s.visual.leftLabel, rightLabel: s.visual.rightLabel },
})));
export default function EditPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const [project, setProject] = useState<any>(null);
  const [editScenes, setEditScenes] = useState<any[]>([]);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<{ service: string; msg: string } | null>(null);
  const [editWarnings, setEditWarnings] = useState<string[]>([]);
  const [previewVersion, setPreviewVersion] = useState(0);
  const render = useRenderJob();
  const didLoad = useRef(false);
  useEffect(() => {
    if (!id || didLoad.current) return;
    didLoad.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) { setLoadError("Project not found. It may have been cleared."); return; }
        const p = await res.json();
        setProject(p);
        setEditScenes(JSON.parse(JSON.stringify(p.scenes || [])));
        render.reset(p.videoUrl || null, p.renderQuality ?? null);
      } catch { setLoadError("Could not load this project."); }
    })();
    return () => render.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  function updateNarration(idx: number, value: string) {
    setEditScenes((prev) => prev.map((s, i) => (i === idx ? { ...s, narration: value } : s)));
  }
  function updateField(idx: number, key: string, value: any) {
    setEditScenes((prev) => prev.map((s, i) => (i === idx ? { ...s, visual: { ...s.visual, [key]: value } } : s)));
  }
  function resetEdits() {
    setEditScenes(project?.scenes ? JSON.parse(JSON.stringify(project.scenes)) : []);
    setEditError(null); setEditWarnings([]);
  }
  async function saveEdits() {
    if (!project) return;
    setSaving(true); setEditError(null); setEditWarnings([]);
    const payload = {
      scenes: editScenes.map((s) => ({
        id: s.id,
        narration: s.narration,
        visual: { title: s.visual.title, subtitle: s.visual.subtitle, bullets: s.visual.bullets, value: s.visual.value, caption: s.visual.caption, quote: s.visual.quote, attribution: s.visual.attribution, leftLabel: s.visual.leftLabel, rightLabel: s.visual.rightLabel },
      })),
    };
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const text = await res.text(); let data: any; try { data = JSON.parse(text); } catch { throw new Error(`Server returned non-JSON: ${text.slice(0, 80)}`); }
      if (!res.ok) { setEditError({ service: data.service || "server", msg: data.error || "Save failed" }); }
      else {
        setProject(data);
        setEditScenes(JSON.parse(JSON.stringify(data.scenes || [])));
        setEditWarnings(data.warnings || []);
        render.setVideoUrl(null);             // previous render is now stale
        setPreviewVersion((v) => v + 1);      // remount Player so re-voiced audio isn't cached
      }
    } catch (e: any) { setEditError({ service: "network", msg: e?.message || "Network error" }); }
    finally { setSaving(false); }
  }
  const previewProject = project ? { ...project, scenes: editScenes.length ? editScenes : project.scenes } : null;
  const landscape = previewProject?.aspect === "landscape";
  const playerStyle: React.CSSProperties = landscape ? { width: "100%", maxWidth: 540, aspectRatio: "16 / 9" } : { width: "100%", maxWidth: 360, aspectRatio: "9 / 16" };
  const dirty = !!project && editableSig(editScenes) !== editableSig(project.scenes);
  const baseNarr = new Map((project?.scenes || []).map((s: any) => [s.id, s.narration]));
  const revoiceCount = editScenes.filter((s) => (s.narration || "").trim() && s.narration.trim() !== baseNarr.get(s.id)).length;
  const softEditError = !!editError && (editError.service === "ratelimit" || editError.service === "murf");
  const softRenderError = /too many|wait about/i.test(render.renderError);
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <style>{`
        .edit-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(380px,560px); gap: 28px; align-items: start; }
        .edit-preview { position: sticky; top: 110px; }
        @media (max-width: 980px) { .edit-grid { grid-template-columns: 1fr; } .edit-preview { position: static; } }
      `}</style>
      <Dock links={[{ label: "Studio", href: "/studio" }]} cta={{ label: "← Back to Studio", href: "/studio" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "140px 24px 80px" }}>
        {loadError ? (
          <div style={{ ...ST.card, textAlign: "center", maxWidth: 520, margin: "40px auto" }}>
            <p style={{ fontWeight: 700, fontSize: 18 }}>Couldn’t open this project</p>
            <p style={{ color: "var(--muted)", marginTop: 8 }}>{loadError}</p>
            <Link href="/studio" style={{ ...ST.btn, display: "inline-block", marginTop: 18, textDecoration: "none" }}>← Back to Studio</Link>
          </div>
        ) : !project ? (
          <p style={{ textAlign: "center", color: "var(--muted)", marginTop: 60 }}>Loading editor…</p>
        ) : (
          <>
            <p style={ST.kicker}>Editor</p>
            <h1 style={ST.h1}>{project.topic}</h1>
            <p style={ST.sub}>Fine-tune every scene. The preview updates as you type.</p>

            {/* INSTRUCTIONS */}
            <div style={ST.howto}>
              <strong style={{ fontSize: 14 }}>How editing works</strong>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 6, fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
                <li>Edit the <b>on-screen text</b> or the spoken <b>narration</b> for any scene below — the preview on the right reflects it live.</li>
                <li>Editing on-screen text only is <b>free and instant</b>. Changing narration <b>re-voices that scene</b> (uses Murf voice credits) and re-syncs its captions when you save.</li>
                <li>Scenes whose narration changed show a <span style={{ color: "#8a5a12", fontWeight: 700 }}>“will re-voice”</span> tag, so you always know what a save will cost.</li>
                <li>Click <b>Save changes</b> to apply, then <b>Render &amp; download</b> to export the updated MP4.</li>
                <li><i>Replacing stock photos/video with your own uploads is coming next.</i></li>
              </ul>
            </div>

            <div className="edit-grid">
              {/* LEFT — scene editor */}
              <div style={{ display: "grid", gap: 14 }}>
                <div style={ST.saveBar}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: dirty ? "var(--accent)" : "var(--accent-2)" }} />
                    <span style={{ color: dirty ? "var(--ink)" : "var(--muted)", fontWeight: dirty ? 600 : 500 }}>{dirty ? "Unsaved changes" : "All changes saved"}</span>
                    {revoiceCount > 0 && <span style={{ ...ST.revoiceChip, marginLeft: 0 }}>{revoiceCount} to re-voice</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={resetEdits} disabled={!dirty || saving} style={{ ...ST.secondary, opacity: !dirty || saving ? 0.5 : 1 }}>Reset</button>
                    <button onClick={saveEdits} disabled={!dirty || saving} style={{ ...ST.btn, padding: "11px 18px", fontSize: 14, opacity: !dirty || saving ? 0.5 : 1 }}>
                      {saving ? "Saving…" : revoiceCount > 0 ? `Save & re-voice ${revoiceCount}` : "Save changes"}
                    </button>
                  </div>
                </div>
                {editError && <div style={softEditError ? ST.softNotice : ST.error}><strong>{editError.service === "murf" ? "💛 Voice budget" : editError.service === "ratelimit" ? "⏳ Slow down" : "❌ Save failed"}</strong><div style={{ marginTop: 6, fontSize: 13 }}>{editError.msg}</div></div>}
                {editWarnings.length > 0 && <div style={ST.warn}>{editWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}</div>}
                {editScenes.map((s, i) => {
                  const fields = SCENE_FIELDS[s.visual.template] || [];
                  const willRevoice = (s.narration || "").trim() && s.narration.trim() !== baseNarr.get(s.id);
                  return (
                    <div key={s.id} style={ST.sceneCard}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={ST.sceneNum}>{i + 1}</span>
                        <span style={ST.sceneTpl}>{s.visual.template.replace(/_/g, " ")}</span>
                        {willRevoice && <span style={ST.revoiceChip}>will re-voice</span>}
                      </div>
                      <label style={ST.miniLabel}>Narration (spoken)</label>
                      <textarea value={s.narration} onChange={(e) => updateNarration(i, e.target.value)} rows={2} style={ST.area} />
                      {fields.map((f) => (
                        <div key={f.key} style={{ marginTop: 10 }}>
                          <label style={ST.miniLabel}>{f.label}</label>
                          {f.list ? (
                            <textarea value={(s.visual[f.key] || []).join("\n")} onChange={(e) => updateField(i, f.key, e.target.value.split("\n"))} rows={3} style={ST.area} />
                          ) : (
                            <input value={s.visual[f.key] || ""} onChange={(e) => updateField(i, f.key, e.target.value)} style={ST.inp} />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* RIGHT — big sticky preview + render */}
              <div className="edit-preview">
                <div style={ST.previewPanel}>
                  {previewProject && (
                    <div style={{ display: "grid", gap: 14, justifyItems: "center", width: "100%" }}>
                      <Player key={previewVersion} component={MainVideo} acknowledgeRemotionLicense inputProps={{ project: previewProject }} durationInFrames={totalFrames(previewProject)} fps={previewProject.fps}
                        compositionWidth={landscape ? 1920 : 1080} compositionHeight={landscape ? 1080 : 1920} controls
                        style={{ ...playerStyle, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(120,90,60,0.25)" }} />
                      <div style={{ width: "100%", maxWidth: landscape ? 540 : 360, display: "grid", gap: 8 }}>
                        {dirty && <div style={ST.dirtyHint}>Save your changes to refresh narration & captions before rendering.</div>}
                        {render.rendering ? (
                          <div><div style={{ fontSize: 14, marginBottom: 6 }}>{render.renderPct > 0 ? `Rendering ${render.renderLabel}… ${Math.round(render.renderPct * 100)}%` : "Preparing…"}</div><div style={ST.barOuter}><div style={{ ...ST.barInner, width: `${Math.max(4, render.renderPct * 100)}%` }} /></div></div>
                        ) : render.videoUrl ? (
                          <>
                            <div style={ST.qualityTag}>{render.doneQuality === "hd" ? "💎 HD video ready" : "⚡ Quick video ready"}</div>
                            <a href={render.videoUrl} download={`${project.id}.mp4`} style={{ ...ST.download, textAlign: "center" }}>⬇ Download MP4</a>
                            <button onClick={() => render.startRender(project.id, "hd")} style={ST.secondary}>💎 Re-render in HD</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => render.startRender(project.id, "quick")} style={{ ...ST.download, opacity: dirty ? 0.6 : 1 }}>🎬 Render &amp; download</button>
                            <button onClick={() => render.startRender(project.id, "hd")} style={ST.secondary}>💎 Render in HD</button>
                          </>
                        )}
                        {render.renderError && <div style={softRenderError ? ST.softNotice : ST.error}>{softRenderError ? "⏳ " : "❌ "}{render.renderError}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
const ST: Record<string, React.CSSProperties> = {
  kicker: { color: "var(--accent)", fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" },
  h1: { fontSize: "clamp(26px,3.4vw,40px)", fontWeight: 800, textAlign: "center", margin: "10px 0 8px", letterSpacing: "-0.025em" },
  sub: { color: "var(--muted)", textAlign: "center", marginBottom: 24, fontSize: 15 },
  card: { background: "#ffffff", border: "1px solid #e0d4bd", borderRadius: 24, padding: 28, boxShadow: "0 30px 80px rgba(120,90,60,0.16)" },
  howto: { background: "#fffdf8", border: "1px solid #e6dcc9", borderRadius: 18, padding: "18px 22px", marginBottom: 26, maxWidth: 1280 },
  saveBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "rgba(255,253,248,0.96)", backdropFilter: "blur(14px)", border: "1px solid #e6dcc9", borderRadius: 14, padding: "11px 14px 11px 18px", position: "sticky", top: 88, zIndex: 5, boxShadow: "0 8px 28px rgba(120,90,60,0.10)" },
  inp: { width: "100%", padding: 12, background: "#faf6ee", border: "1.5px solid #e0d4bd", borderRadius: 12, color: "var(--ink)", fontSize: 14 },
  area: { width: "100%", padding: 10, background: "#faf6ee", border: "1.5px solid #e0d4bd", borderRadius: 10, color: "var(--ink)", fontSize: 13.5, lineHeight: 1.45, resize: "vertical", fontFamily: "inherit" },
  btn: { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 16, padding: "13px 18px", boxShadow: "0 10px 26px rgba(229,83,43,0.28)" },
  secondary: { padding: "11px 16px", background: "#faf6ee", color: "var(--ink)", border: "1.5px solid #e0d4bd", borderRadius: 12, cursor: "pointer", fontWeight: 600 },
  error: { background: "#fae6e0", border: "1px solid #e8a594", color: "#9c3418", borderRadius: 12, padding: 14 },
  softNotice: { background: "#fbf1dc", border: "1px solid #e8c98a", color: "#8a5a12", borderRadius: 12, padding: 14, fontSize: 13 },
  warn: { background: "#f7eccf", border: "1px solid #ddc079", color: "#7a5a18", borderRadius: 12, padding: 12, fontSize: 13, display: "grid", gap: 4 },
  sceneCard: { background: "#fff", border: "1px solid #e7dcc8", borderRadius: 16, padding: 16, boxShadow: "0 6px 22px rgba(120,90,60,0.05)" },
  sceneNum: { width: 24, height: 24, borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sceneTpl: { fontSize: 12.5, fontWeight: 600, color: "var(--muted)", textTransform: "capitalize", letterSpacing: 0.3 },
  revoiceChip: { marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: "#8a5a12", background: "#fbf1dc", border: "1px solid #e8c98a", borderRadius: 99, padding: "2px 9px" },
  miniLabel: { fontSize: 11, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 4 },
  previewPanel: { background: "rgba(255,255,255,0.72)", backdropFilter: "blur(10px)", border: "1px solid #e0d4bd", borderRadius: 24, padding: "26px 22px", minHeight: 460, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 30px 80px rgba(120,90,60,0.12)" },
  dirtyHint: { fontSize: 12, color: "#8a5a12", background: "#fbf1dc", border: "1px solid #e8c98a", borderRadius: 10, padding: "8px 12px", textAlign: "center" },
  qualityTag: { textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--accent-2)" },
  download: { padding: "13px 16px", background: "var(--accent-2)", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, textDecoration: "none", display: "block", textAlign: "center" },
  barOuter: { height: 10, background: "var(--bg-2)", borderRadius: 99, overflow: "hidden" },
  barInner: { height: "100%", background: "var(--accent)", transition: "width .4s" },
};