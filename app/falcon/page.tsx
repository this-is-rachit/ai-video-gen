// app/falcon/page.tsx
"use client";
import { useState } from "react";

// Valid voice + locale pairs from Falcon's voice list
const VOICES = [
  { label: "Matthew — English (US)", voiceId: "Matthew", locale: "en-US" },
  { label: "Hazel — English (UK)",   voiceId: "Hazel",   locale: "en-UK" },
  { label: "Aman — Hindi",           voiceId: "Aman",    locale: "hi-IN" },
  { label: "Carla — Spanish (Spain)",voiceId: "Carla",   locale: "es-ES" },
  { label: "Amara — French",         voiceId: "Amara",   locale: "fr-FR" },
];

export default function FalconTest() {
  const [text, setText] = useState("Hi! This is my first sentence spoken by Murf Falcon.");
  const [v, setV] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function speak() {
    setLoading(true); setError(""); setAudioUrl("");
    const res = await fetch("/api/falcon-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId: VOICES[v].voiceId, locale: VOICES[v].locale }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Request failed" }));
      setError(data.error ?? "Error"); setLoading(false); return;
    }
    setAudioUrl(URL.createObjectURL(await res.blob()));
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 560, margin: "60px auto", fontFamily: "system-ui", display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Hello Falcon 🦅</h1>

      <label>Voice
        <select value={v} onChange={(e) => setV(Number(e.target.value))} style={inp}>
          {VOICES.map((opt, i) => <option key={i} value={i}>{opt.label}</option>)}
        </select>
      </label>

      <label>Text
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} style={inp} />
      </label>

      <button onClick={speak} disabled={loading} style={btn}>
        {loading ? "Generating..." : "Speak"}
      </button>

      {error && <p style={{ color: "#dc2626" }}>❌ {error}</p>}
      {audioUrl && <audio controls autoPlay src={audioUrl} style={{ width: "100%" }} />}
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: 8, marginTop: 4, border: "1px solid #d4d4d8", borderRadius: 8 };
const btn: React.CSSProperties = { padding: "10px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" };