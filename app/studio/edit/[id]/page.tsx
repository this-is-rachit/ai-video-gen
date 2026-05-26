// app/studio/edit/[id]/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Player } from "@remotion/player";
import { MainVideo, totalFrames } from "@/remotion/Video";
import Dock from "@/components/Dock";
import { useRenderJob } from "@/components/useRenderJob";
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
const MEDIA_SLOTS: Record<string, { field: string; label: string; accept: string; kind: "image" | "video" }[]> = {
  title_card: [{ field: "bgImageUrl", label: "Background image", accept: "image/*", kind: "image" }],
  bullet_reveal: [{ field: "bgImageUrl", label: "Background image", accept: "image/*", kind: "image" }],
  image_caption: [{ field: "imageUrl", label: "Image", accept: "image/*", kind: "image" }],
  b_roll: [{ field: "bRollUrl", label: "Video clip", accept: "video/*", kind: "video" }],
  big_number: [{ field: "bgImageUrl", label: "Background image", accept: "image/*", kind: "image" }],
  quote: [{ field: "bgImageUrl", label: "Background image", accept: "image/*", kind: "image" }],
  whiteboard: [],
  outro: [{ field: "bgImageUrl", label: "Background image", accept: "image/*", kind: "image" }],
  montage: [],
  comparison: [
    { field: "leftImageUrl", label: "Left image", accept: "image/*", kind: "image" },
    { field: "rightImageUrl", label: "Right image", accept: "image/*", kind: "image" },
  ],
};
function mediaSlotsFor(s: any) {
  if (s.visual.template === "montage") {
    const urls = (s.visual.imageUrls || []) as string[];
    const slots = urls.map((u, i) => ({ field: "imageUrls", index: i as number | undefined, label: `Image ${i + 1}`, accept: "image/*", kind: "image" as const, current: u }));
    return slots.length ? slots : [{ field: "imageUrls", index: 0 as number | undefined, label: "Image 1", accept: "image/*", kind: "image" as const, current: undefined as any }];
  }
  return (MEDIA_SLOTS[s.visual.template] || []).map((b) => ({ ...b, index: undefined as number | undefined, current: s.visual[b.field] }));
}
const editableSig = (scenes: any[]) => JSON.stringify((scenes || []).map((s) => ({
  id: s.id, n: s.narration,
  v: { title: s.visual.title, subtitle: s.visual.subtitle, bullets: s.visual.bullets, value: s.visual.value, caption: s.visual.caption, quote: s.visual.quote, attribution: s.visual.attribution, leftLabel: s.visual.leftLabel, rightLabel: s.visual.rightLabel },
})));
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export default function EditPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const [project, setProject] = useState<any>(null);
  const [editScenes, setEditScenes] = useState<any[]>([]);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [editError, setEditError] = useState<{ service: string; msg: string } | null>(null);
  const [editWarnings, setEditWarnings] = useState<string[]>([]);
  const [previewVersion, setPreviewVersion] = useState(0);
  // pending video trim: { sceneId, field, file, clipDur, start, end, sceneSec }
  const [trim, setTrim] = useState<any>(null);
  const render = useRenderJob();
  const didLoad = useRef(false);
  const originalScenes = useRef<any[]>([]); // pristine media+text snapshot for Reset
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
        originalScenes.current = JSON.parse(JSON.stringify(p.scenes || [])); // pristine snapshot
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
  async function resetEdits() {
    const orig = originalScenes.current;
    if (!project || !orig.length) return;
    setEditError(null); setEditWarnings([]);
    // Did any scene's media differ from the original (i.e. an upload happened)?
    const base = new Map(project.scenes.map((s: any) => [s.id, s]));
    const mediaChanged = orig.some((o: any) => {
      const cur: any = base.get(o.id); if (!cur) return false;
      const k = ["imageUrl", "bgImageUrl", "bRollUrl", "leftImageUrl", "rightImageUrl"];
      return k.some((f) => (cur.visual[f] || null) !== (o.visual[f] || null)) ||
        JSON.stringify(cur.visual.imageUrls || null) !== JSON.stringify(o.visual.imageUrls || null);
    });
    // Always restore text instantly in the editor.
    setEditScenes(JSON.parse(JSON.stringify(orig)));
    if (!mediaChanged) return; // text-only reset — done
    // Media was replaced by uploads (persisted server-side) → restore it on the server.
    setSaving(true);
    try {
      const payload = {
        scenes: orig.map((o: any) => ({
          id: o.id,
          restoreMedia: {
            imageUrl: o.visual.imageUrl ?? null, imageCredit: o.visual.imageCredit ?? null,
            bgImageUrl: o.visual.bgImageUrl ?? null, bRollUrl: o.visual.bRollUrl ?? null,
            bRollCredit: o.visual.bRollCredit ?? null, leftImageUrl: o.visual.leftImageUrl ?? null,
            rightImageUrl: o.visual.rightImageUrl ?? null, imageUrls: o.visual.imageUrls ?? null,
          },
        })),
      };
      const res = await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setEditError({ service: data.service || "server", msg: data.error || "Reset failed" }); return; }
      setProject(data);
      setEditScenes(JSON.parse(JSON.stringify(data.scenes || [])));
      render.setVideoUrl(null);
      setPreviewVersion((v) => v + 1); // remount so original media reloads in preview
    } catch (e: any) { setEditError({ service: "network", msg: e?.message || "Reset failed" }); }
    finally { setSaving(false); }
  }
  function mergeUploadResult(data: any, sceneId: string) {
    setEditScenes((prev) => prev.map((s) => {
      if (s.id !== sceneId) return s;
      const u = (data.scenes || []).find((x: any) => x.id === sceneId);
      if (!u) return s;
      const mv = u.visual;
      return { ...s, visual: { ...s.visual, imageUrl: mv.imageUrl, imageCredit: mv.imageCredit, bgImageUrl: mv.bgImageUrl, bRollUrl: mv.bRollUrl, bRollCredit: mv.bRollCredit, leftImageUrl: mv.leftImageUrl, rightImageUrl: mv.rightImageUrl, imageUrls: mv.imageUrls, userUploaded: mv.userUploaded } };
    }));
    setProject(data);
    render.setVideoUrl(null);
    setPreviewVersion((v) => v + 1);
  }
  async function uploadImage(sceneId: string, field: string, file: File, index?: number) {
    if (!project) return;
    const key = `${sceneId}:${field}:${index ?? ""}`;
    setUploading(key); setEditError(null);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("sceneId", sceneId); fd.append("field", field);
      if (index != null) fd.append("index", String(index));
      const res = await fetch(`/api/projects/${project.id}/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setEditError({ service: "upload", msg: data.error || "Upload failed" }); return; }
      mergeUploadResult(data, sceneId);
      if (data.warning) setEditWarnings([data.warning]);
    } catch (e: any) { setEditError({ service: "network", msg: e?.message || "Upload failed" }); }
    finally { setUploading(""); }
  }
  // For video: read its duration in the browser, then open the trim panel.
  function pickVideo(sceneId: string, field: string, file: File, sceneSec: number) {
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      const clipDur = Math.max(0.5, vid.duration || sceneSec);
      const end = Math.min(clipDur, sceneSec || clipDur);
      URL.revokeObjectURL(url);
      setTrim({ sceneId, field, file, clipDur, start: 0, end, sceneSec });
    };
    vid.onerror = () => { URL.revokeObjectURL(url); setEditError({ service: "upload", msg: "Couldn’t read that video file." }); };
    vid.src = url;
  }
  async function confirmTrim() {
    if (!trim || !project) return;
    const key = `${trim.sceneId}:${trim.field}:`;
    setUploading(key); setEditError(null);
    try {
      const fd = new FormData();
      fd.append("file", trim.file); fd.append("sceneId", trim.sceneId); fd.append("field", trim.field);
      fd.append("startSec", String(trim.start)); fd.append("endSec", String(trim.end));
      const res = await fetch(`/api/projects/${project.id}/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setEditError({ service: "upload", msg: data.error || "Upload failed" }); return; }
      mergeUploadResult(data, trim.sceneId);
      if (data.warning) setEditWarnings([data.warning]);
      setTrim(null);
    } catch (e: any) { setEditError({ service: "network", msg: e?.message || "Upload failed" }); }
    finally { setUploading(""); }
  }
  async function saveEdits() {
    if (!project) return;
    setSaving(true); setEditError(null); setEditWarnings([]);
    const payload = {
      scenes: editScenes.map((s) => ({
        id: s.id, narration: s.narration,
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
        render.setVideoUrl(null);
        setPreviewVersion((v) => v + 1);
      }
    } catch (e: any) { setEditError({ service: "network", msg: e?.message || "Network error" }); }
    finally { setSaving(false); }
  }
  const previewProject = project ? { ...project, scenes: editScenes.length ? editScenes : project.scenes } : null;
  const landscape = previewProject?.aspect === "landscape";
  const playerStyle: React.CSSProperties = landscape ? { width: "100%", maxWidth: 540, aspectRatio: "16 / 9" } : { width: "100%", maxWidth: 360, aspectRatio: "9 / 16" };
  const dirty = !!project && editableSig(editScenes) !== editableSig(project.scenes);
  // media differs from the pristine snapshot? (uploads persist immediately, so
  // this is what lets Reset undo an upload even with no pending text edits)
  const mediaDirty = !!project && originalScenes.current.length > 0 && project.scenes.some((cur: any) => {
    const o = originalScenes.current.find((x: any) => x.id === cur.id); if (!o) return false;
    const k = ["imageUrl", "bgImageUrl", "bRollUrl", "leftImageUrl", "rightImageUrl"];
    return k.some((f) => (cur.visual[f] || null) !== (o.visual[f] || null)) ||
      JSON.stringify(cur.visual.imageUrls || null) !== JSON.stringify(o.visual.imageUrls || null);
  });
  const canReset = dirty || mediaDirty;
  const baseNarr = new Map((project?.scenes || []).map((s: any) => [s.id, s.narration]));
  const revoiceCount = editScenes.filter((s) => (s.narration || "").trim() && s.narration.trim() !== baseNarr.get(s.id)).length;
  const softEditError = !!editError && (editError.service === "ratelimit" || editError.service === "murf");
  const softRenderError = /too many|wait about/i.test(render.renderError);
  const fps = project?.fps || 30;
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <style>{`
        .edit-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(380px,560px); gap: 28px; align-items: start; }
        .edit-preview { position: sticky; top: 110px; }
        @media (max-width: 980px) { .edit-grid { grid-template-columns: 1fr; } .edit-preview { position: static; } }
      `}</style>
      <Dock links={[{ label: "Studio", href: "/studio" }]} cta={{ label: "← Back to Studio", href: "/studio" }} />

      {/* VIDEO TRIM MODAL */}
      {trim && (
        <div style={ST.modalWrap} onClick={() => uploading ? null : setTrim(null)}>
          <div style={ST.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: 18 }}>Trim your clip</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
              Pick the part of your video to use. This scene is about <b>{trim.sceneSec.toFixed(1)}s</b> long — aim for a similar length. Your clip is {fmt(trim.clipDur)}.
            </p>
            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              <div>
                <div style={ST.trimLabel}><span>Start</span><span>{trim.start.toFixed(1)}s</span></div>
                <input type="range" min={0} max={Math.max(0, trim.clipDur - 0.5)} step={0.1} value={trim.start}
                  onChange={(e) => { const v = Math.min(Number(e.target.value), trim.end - 0.5); setTrim({ ...trim, start: Math.max(0, v) }); }}
                  style={{ width: "100%", accentColor: "var(--accent)" }} />
              </div>
              <div>
                <div style={ST.trimLabel}><span>End</span><span>{trim.end.toFixed(1)}s</span></div>
                <input type="range" min={0.5} max={trim.clipDur} step={0.1} value={trim.end}
                  onChange={(e) => { const v = Math.max(Number(e.target.value), trim.start + 0.5); setTrim({ ...trim, end: Math.min(trim.clipDur, v) }); }}
                  style={{ width: "100%", accentColor: "var(--accent)" }} />
              </div>
              <div style={ST.trimSel}>Selected: <b>{(trim.end - trim.start).toFixed(1)}s</b> of footage</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setTrim(null)} disabled={!!uploading} style={{ ...ST.secondary, flex: 1, opacity: uploading ? 0.5 : 1 }}>Cancel</button>
              <button onClick={confirmTrim} disabled={!!uploading} style={{ ...ST.btn, flex: 1, padding: "12px 16px", fontSize: 15, opacity: uploading ? 0.6 : 1 }}>{uploading ? "Processing…" : "Use this clip"}</button>
            </div>
          </div>
        </div>
      )}

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

            <div style={ST.howto}>
              <strong style={{ fontSize: 14 }}>How editing works</strong>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 6, fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
                <li>Edit the <b>on-screen text</b> or the spoken <b>narration</b> for any scene — the preview on the right reflects it live.</li>
                <li>Editing on-screen text only is <b>free and instant</b>. Changing narration <b>re-voices that scene</b> (uses Murf voice credits) and re-syncs its captions when you save.</li>
                <li><b>Replace any stock photo or video with your own.</b> Images are auto-fitted to the frame; for video you choose which part of the clip to use, and we trim &amp; fit it for you.</li>
                <li>Click <b>Save changes</b> for text/narration edits, then <b>Render &amp; download</b> to export the updated MP4.</li>
              </ul>
            </div>

            <div className="edit-grid">
              <div style={{ display: "grid", gap: 14 }}>
                <div style={ST.saveBar}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: dirty ? "var(--accent)" : "var(--accent-2)" }} />
                    <span style={{ color: dirty ? "var(--ink)" : "var(--muted)", fontWeight: dirty ? 600 : 500 }}>{dirty ? "Unsaved changes" : "All changes saved"}</span>
                    {revoiceCount > 0 && <span style={{ ...ST.revoiceChip, marginLeft: 0 }}>{revoiceCount} to re-voice</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={resetEdits} disabled={!canReset || saving} style={{ ...ST.secondary, opacity: !canReset || saving ? 0.5 : 1 }}>Reset</button>
                    <button onClick={saveEdits} disabled={!dirty || saving} style={{ ...ST.btn, padding: "11px 18px", fontSize: 14, opacity: !dirty || saving ? 0.5 : 1 }}>
                      {saving ? "Saving…" : revoiceCount > 0 ? `Save & re-voice ${revoiceCount}` : "Save changes"}
                    </button>
                  </div>
                </div>
                {editError && <div style={softEditError ? ST.softNotice : ST.error}><strong>{editError.service === "murf" ? "💛 Voice budget" : editError.service === "ratelimit" ? "⏳ Slow down" : editError.service === "upload" ? "📎 Upload" : "❌ Save failed"}</strong><div style={{ marginTop: 6, fontSize: 13 }}>{editError.msg}</div></div>}
                {editWarnings.length > 0 && <div style={ST.warn}>{editWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}</div>}
                {editScenes.map((s, i) => {
                  const fields = SCENE_FIELDS[s.visual.template] || [];
                  const slots = mediaSlotsFor(s);
                  const willRevoice = (s.narration || "").trim() && s.narration.trim() !== baseNarr.get(s.id);
                  const sceneSec = (s.durationFrames || 0) / fps;
                  return (
                    <div key={s.id} style={ST.sceneCard}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={ST.sceneNum}>{i + 1}</span>
                        <span style={ST.sceneTpl}>{s.visual.template.replace(/_/g, " ")}</span>
                        {s.visual.userUploaded && <span style={ST.uploadChip}>custom media</span>}
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
                      {slots.length > 0 && (
                        <div style={{ marginTop: 12, borderTop: "1px dashed #e7dcc8", paddingTop: 12, display: "grid", gap: 10 }}>
                          {slots.map((slot, si) => {
                            const key = `${s.id}:${slot.field}:${slot.index ?? ""}`;
                            const busy = uploading === key;
                            return (
                              <div key={si} style={ST.mediaRow}>
                                {slot.kind === "image" && slot.current ? (
                                  <img src={slot.current} alt="" style={ST.thumb} />
                                ) : (
                                  <div style={{ ...ST.thumb, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "var(--muted)" }}>{slot.kind === "video" ? "🎞" : "🖼"}</div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{slot.label}</div>
                                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{slot.current ? (slot.kind === "video" ? "Clip set" : "Image set") : "Using stock"}</div>
                                </div>
                                <label style={{ ...ST.uploadBtn, opacity: busy ? 0.6 : 1 }}>
                                  {busy ? "…" : "Upload"}
                                  <input type="file" accept={slot.accept} disabled={busy} style={{ display: "none" }}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) { slot.kind === "video" ? pickVideo(s.id, slot.field, f, sceneSec) : uploadImage(s.id, slot.field, f, slot.index); }
                                      e.currentTarget.value = "";
                                    }} />
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

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
  uploadChip: { fontSize: 10.5, fontWeight: 700, color: "var(--accent-2)", background: "rgba(78,124,107,0.12)", border: "1px solid rgba(78,124,107,0.35)", borderRadius: 99, padding: "2px 9px" },
  miniLabel: { fontSize: 11, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 4 },
  mediaRow: { display: "flex", alignItems: "center", gap: 12 },
  thumb: { width: 52, height: 52, borderRadius: 10, objectFit: "cover", border: "1px solid #e0d4bd", background: "#faf6ee", flexShrink: 0 },
  uploadBtn: { padding: "9px 14px", background: "#faf6ee", color: "var(--accent)", border: "1.5px solid #e0d4bd", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" },
  previewPanel: { background: "rgba(255,255,255,0.72)", backdropFilter: "blur(10px)", border: "1px solid #e0d4bd", borderRadius: 24, padding: "26px 22px", minHeight: 460, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 30px 80px rgba(120,90,60,0.12)" },
  dirtyHint: { fontSize: 12, color: "#8a5a12", background: "#fbf1dc", border: "1px solid #e8c98a", borderRadius: 10, padding: "8px 12px", textAlign: "center" },
  qualityTag: { textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--accent-2)" },
  download: { padding: "13px 16px", background: "var(--accent-2)", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, textDecoration: "none", display: "block", textAlign: "center" },
  barOuter: { height: 10, background: "var(--bg-2)", borderRadius: 99, overflow: "hidden" },
  barInner: { height: "100%", background: "var(--accent)", transition: "width .4s" },
  modalWrap: { position: "fixed", inset: 0, background: "rgba(33,28,23,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: "#fff", border: "1px solid #e0d4bd", borderRadius: 22, padding: 26, width: "min(460px, 100%)", boxShadow: "0 40px 100px rgba(120,90,60,0.3)" },
  trimLabel: { display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", marginBottom: 6 },
  trimSel: { fontSize: 12.5, color: "var(--accent-2)", fontWeight: 600, textAlign: "center", background: "rgba(78,124,107,0.1)", borderRadius: 10, padding: "8px 12px" },
};