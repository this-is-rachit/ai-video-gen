// components/useRenderJob.ts
// Shared client hook for the render→poll→download lifecycle, used by both the
// Studio page and the Edit page so the (already-proven) polling logic lives in
// one place. Fault-tolerant: tolerates a few consecutive poll misses, leaning
// on the render route's disk-status fallback.
"use client";
import { useRef, useState } from "react";

export type Quality = "quick" | "hd";

export function useRenderJob() {
  const [rendering, setRendering] = useState(false);
  const [renderPct, setRenderPct] = useState(0);
  const [renderLabel, setRenderLabel] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [doneQuality, setDoneQuality] = useState<Quality | null>(null);
  const [renderError, setRenderError] = useState("");
  const pollTimer = useRef<any>(null);

  /** Point the hook at an existing project's stored render state. */
  function reset(initialVideoUrl: string | null, initialQuality: Quality | null) {
    clearInterval(pollTimer.current);
    setRendering(false); setRenderPct(0); setRenderError("");
    setVideoUrl(initialVideoUrl); setDoneQuality(initialVideoUrl ? initialQuality : null);
  }

  function stop() { clearInterval(pollTimer.current); }

  async function startRender(id: string, q: Quality) {
    if (!id) return;
    setRenderError(""); setRendering(true); setRenderPct(0); setVideoUrl(null); setDoneQuality(null); setRenderLabel(q === "hd" ? "HD" : "Quick");
    try {
      const res = await fetch(`/api/projects/${id}/render`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quality: q }) });
      const text = await res.text(); let data: any; try { data = JSON.parse(text); } catch { throw new Error(`Server returned non-JSON: ${text.slice(0, 80)}`); }
      if (!res.ok) { setRenderError(data.error || "Render failed to start"); setRendering(false); return; }
      clearInterval(pollTimer.current); let polls = 0; let failStreak = 0;
      pollTimer.current = setInterval(async () => {
        polls++; if (polls > 360) { clearInterval(pollTimer.current); setRendering(false); setRenderError("Render timed out — check terminal."); return; }
        try {
          const j = await (await fetch(`/api/projects/${id}/render`)).json();
          failStreak = 0;
          if (j.status === "rendering") setRenderPct(j.progress || 0);
          else if (j.status === "done") { clearInterval(pollTimer.current); setRendering(false); setRenderPct(1); setVideoUrl(j.videoUrl); setDoneQuality((j.quality as Quality) ?? q); }
          else if (j.status === "error") { clearInterval(pollTimer.current); setRendering(false); setRenderError(j.error || "Render failed"); }
          else if (j.status === "idle") { if (++failStreak >= 5) { clearInterval(pollTimer.current); setRendering(false); setRenderError("Render job not found — retry."); } }
        } catch { if (++failStreak >= 5) { clearInterval(pollTimer.current); setRendering(false); setRenderError("Lost connection to render job — retry."); } }
      }, 2500);
    } catch (e: any) { setRendering(false); setRenderError(e?.message || "Network error"); }
  }

  return { rendering, renderPct, renderLabel, videoUrl, doneQuality, renderError, startRender, reset, stop, setVideoUrl };
}