// app/projects/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  async function load() {
    setProjects(await (await fetch("/api/projects")).json());
  }
  useEffect(() => { load(); }, []);

  async function createSample() {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    load();
  }

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", fontFamily: "system-ui", display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Projects — data model test</h1>
      <button onClick={createSample} style={btn}>+ Create sample project</button>

      <div style={{ display: "grid", gap: 8 }}>
        {projects.length === 0 && <p>No projects yet.</p>}
        {projects.map((p) => (
          <button key={p.id} onClick={() => setSelected(p)} style={card}>
            <strong>{p.topic}</strong><br />
            <small>{p.id} · {p.scenes.length} scenes · {p.status}</small>
          </button>
        ))}
      </div>

      {selected && (
        <pre style={{ whiteSpace: "pre-wrap", background: "#f4f4f5", padding: 12, borderRadius: 8, fontSize: 12 }}>
          {JSON.stringify(selected, null, 2)}
        </pre>
      )}
    </div>
  );
}

const btn: React.CSSProperties = { padding: "10px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", width: "fit-content" };
const card: React.CSSProperties = { padding: 12, border: "1px solid #e4e4e7", borderRadius: 8, background: "#fff", cursor: "pointer", textAlign: "left" };