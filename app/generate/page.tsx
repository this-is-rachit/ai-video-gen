// app/generate/page.tsx
"use client";
import { useEffect, useState } from "react";

const PROVIDERS = [["openai","OpenAI"],["anthropic","Anthropic (Claude)"],["google","Google (Gemini)"],["xai","xAI (Grok)"]];
const LANGS = [["en-US","English (US)"],["hi-IN","Hindi"],["es-ES","Spanish"],["fr-FR","French"]];

export default function GeneratePage() {
  const [topic, setTopic] = useState("How black holes work");
  const [language, setLanguage] = useState("en-US");
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState("");

  // BYOK settings persist in the browser only
  useEffect(() => {
    setProvider(localStorage.getItem("llm_provider") || "openai");
    setApiKey(localStorage.getItem("llm_key") || "");
    setModel(localStorage.getItem("llm_model") || "");
  }, []);
  useEffect(() => { localStorage.setItem("llm_provider", provider); }, [provider]);
  useEffect(() => { localStorage.setItem("llm_key", apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem("llm_model", model); }, [model]);

  async function generate() {
    setLoading(true); setError(""); setProject(null);
    const res = await fetch("/api/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, language, provider, apiKey, model }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error); else setProject(data);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 720, margin: "48px auto", fontFamily: "system-ui", display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Script engine test</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value)} style={inp}>
            {PROVIDERS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
        </label>
        <label>Model (optional)
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="default" style={inp} />
        </label>
      </div>

      <label>Your LLM API key (browser only)
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." style={inp} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
        <label>Topic
          <input value={topic} onChange={(e) => setTopic(e.target.value)} style={inp} />
        </label>
        <label>Language
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inp}>
            {LANGS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
        </label>
      </div>

      <button onClick={generate} disabled={loading} style={btn}>
        {loading ? "Researching + writing..." : "Generate script"}
      </button>

      {error && <p style={{ color: "#dc2626" }}>❌ {error}</p>}

      {project && (
        <div style={{ display: "grid", gap: 8 }}>
          <p><strong>{project.scenes.length} scenes</strong> · saved as <code>{project.id}</code></p>
          {project.scenes.map((s: any, i: number) => (
            <div key={s.id} style={card}>
              <small style={{ color: "#71717a" }}>#{i + 1} · {s.visual.template}</small>
              <div>{s.narration}</div>
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