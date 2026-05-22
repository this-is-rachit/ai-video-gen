// app/test/page.tsx
"use client";
import { useState } from "react";

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic (Claude)" },
  { id: "google", label: "Google (Gemini)" },
  { id: "xai", label: "xAI (Grok)" },
];

export default function TestPage() {
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("Say hello in one short sentence.");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult("");
    const res = await fetch("/api/llm-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey, model, prompt }),
    });
    const data = await res.json();
    setResult(data.text ?? `❌ ${data.error}`);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 560, margin: "60px auto", fontFamily: "system-ui", display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>BYOK LLM test</h1>

      <label>Provider
        <select value={provider} onChange={(e) => setProvider(e.target.value)} style={inp}>
          {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>

      <label>Your API key (not stored anywhere)
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={inp} placeholder="sk-..." />
      </label>

      <label>Model (optional — leave blank for default)
        <input value={model} onChange={(e) => setModel(e.target.value)} style={inp} placeholder="e.g. gpt-4o" />
      </label>

      <label>Prompt
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} style={inp} />
      </label>

      <button onClick={run} disabled={loading} style={btn}>
        {loading ? "Thinking..." : "Run"}
      </button>

      {result && <pre style={{ whiteSpace: "pre-wrap", background: "#f4f4f5", padding: 12, borderRadius: 8 }}>{result}</pre>}
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: 8, marginTop: 4, border: "1px solid #d4d4d8", borderRadius: 8 };
const btn: React.CSSProperties = { padding: "10px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" };