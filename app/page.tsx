// app/page.tsx
"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Dock from "@/components/Dock";
import { LANGUAGE_COUNT } from "@/lib/voices";
const InteractiveField = dynamic(() => import("@/components/InteractiveField"), { ssr: false });

const MARQUEE_A = ["Black holes", "How GPS works", "The French Revolution", "Compound interest", "Photosynthesis", "Why the sky is blue"];
const MARQUEE_B = ["Quantum computing", "The Roman Empire", "How vaccines work", "Ocean currents", "The stock market", "How memory works"];
const STEPS = [
  { n: "01", t: "Type one topic", d: "A single line is all we need. Reelify researches it and writes a tight, structured script with a clear hook and payoff." },
  { n: "02", t: "We produce it", d: "Falcon narrates, captions sync to every word, and each beat is matched to visuals, motion and a soundtrack." },
  { n: "03", t: "Export anywhere", d: "Preview instantly, then download an MP4 in 9:16 for Shorts and Reels or 16:9 for YouTube. No timeline, no editing." },
];
const FEATURES = [
  { i: "✍️", t: "Researched scripts", d: "Bring your own LLM key. We turn a topic into punchy, accurate narration." },
  { i: "🎙️", t: "Real voice + captions", d: `Falcon narration with word-synced captions across ${LANGUAGE_COUNT} languages.` },
  { i: "🎬", t: "Cinematic visuals", d: "Animated scenes, stock photos & b-roll, and a palette that shifts per topic." },
  { i: "📐", t: "Both formats", d: "Portrait and landscape from the same project — one click each." },
];
const STATS = [{ v: LANGUAGE_COUNT, s: "", l: "Languages" }, { v: 10, s: "", l: "Scene templates" }, { v: 6, s: "", l: "Style packs" }, { v: 1, s: "-click", l: "To a finished video" }];
export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const rowARef = useRef<HTMLDivElement>(null);
  const rowBRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Kick the Remotion bundle warmup while the user reads the homepage, so the
    // first render in Studio doesn't pay the ~1-min bundle cost.
    fetch("/api/warmup").catch(() => {});
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.to(bar.current, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
      gsap.from(".hero-stagger", { y: 46, opacity: 0, duration: 0.95, stagger: 0.12, ease: "power3.out", delay: 0.15 });
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => gsap.from(el, { y: 56, opacity: 0, duration: 0.85, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } }));
      // velocity-reactive dual marquee
      const rowA = rowARef.current, rowB = rowBRef.current;
      if (rowA && rowB) {
        const wA = rowA.scrollWidth / 2, wB = rowB.scrollWidth / 2;
        const tlA = gsap.to(rowA, { x: -wA, duration: 30, ease: "none", repeat: -1 });
        const tlB = gsap.fromTo(rowB, { x: -wB }, { x: 0, duration: 30, ease: "none", repeat: -1 });
        let cur = 1;
        ScrollTrigger.create({
          start: 0, end: "max",
          onUpdate: (self) => {
            const target = 1 + Math.min(Math.abs(self.getVelocity()) / 350, 6);
            cur += (target - cur) * 0.1;
            tlA.timeScale(cur); tlB.timeScale(cur);
          },
        });
        gsap.ticker.add(() => { cur += (1 - cur) * 0.03; tlA.timeScale(cur); tlB.timeScale(cur); });
      }
      gsap.utils.toArray<HTMLElement>(".count").forEach((el) => {
        const target = Number(el.dataset.target || "0"), suffix = el.dataset.suffix || "", o = { v: 0 };
        gsap.to(o, { v: target, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 92%" }, onUpdate: () => { el.textContent = Math.round(o.v) + suffix; } });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root}>
      <div ref={bar} style={S.progress} />
      <Dock links={[{ label: "How it works", href: "#how" }, { label: "Features", href: "#features" }]} cta={{ label: "Open Studio →", href: "/studio" }} />

      <main>
        <section style={S.hero}>
          <InteractiveField density={0.34} dotSize={0.1} opacity={0.9} radius={1.6} />
          <div style={S.heroFade} />
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 960, padding: "0 24px" }}>
            <p className="hero-stagger" style={S.kickerTop}>Reelify · AI video studio</p>
            <h1 className="hero-stagger" style={S.h1}>Turn a single topic into a <span style={S.grad}>finished video.</span></h1>
            <p className="hero-stagger" style={S.lead}>Script, voiceover, captions, visuals and music — generated and perfectly synced. Portrait or landscape, ready to post in minutes.</p>
            <div className="hero-stagger" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
              <Link href="/studio" style={S.primary}>Create a video →</Link>
              <a href="#how" style={S.ghost}>See how it works</a>
            </div>
          </div>
          <div className="hero-stagger" style={S.scrollCue}>Scroll ↓</div>
        </section>

       <section style={S.marqueeWrap}>
          <div style={S.marqueeMask}>
            <div ref={rowARef} style={{ display: "flex", gap: 14, width: "max-content" }}>
              {[...MARQUEE_A, ...MARQUEE_A].map((m, i) => <span key={`a${i}`} style={S.chip}>{m}</span>)}
            </div>
            <div ref={rowBRef} style={{ display: "flex", gap: 14, width: "max-content", marginTop: 14 }}>
              {[...MARQUEE_B, ...MARQUEE_B].map((m, i) => <span key={`b${i}`} style={{ ...S.chip, ...S.chipAlt }}>{m}</span>)}
            </div>
          </div>
        </section>

        <section id="how" style={{ ...S.section, background: "var(--paper)" }}>
          <p className="reveal" style={S.kicker}>How it works</p>
          <h2 className="reveal" style={S.h2}>Three steps. Zero editing.</h2>
          <div style={{ display: "grid", gap: 16, marginTop: 52 }}>
            {STEPS.map((s) => (
              <div key={s.n} className="reveal" style={S.step}>
                <span style={S.stepNum}>{s.n}</span>
                <div><h3 style={{ fontSize: 23, fontWeight: 700, marginBottom: 8 }}>{s.t}</h3><p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 660 }}>{s.d}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" style={{ ...S.section }}>
          <p className="reveal" style={S.kicker}>What you get</p>
          <h2 className="reveal" style={S.h2}>Everything, in one click.</h2>
          <div style={S.grid}>
            {FEATURES.map((f) => (
              <div key={f.t} className="reveal feat" style={S.card}>
                <div style={{ fontSize: 30 }}>{f.i}</div>
                <h3 style={{ fontSize: 19, fontWeight: 700, margin: "16px 0 8px" }}>{f.t}</h3>
                <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...S.section, background: "var(--paper)" }}>
          <p className="reveal" style={S.kicker}>One project, two formats</p>
          <h2 className="reveal" style={S.h2}>Built for every feed.</h2>
          <div className="reveal" style={S.formats}>
            <div style={S.frameLandscape}><span style={S.frameLabel}>16:9 · YouTube</span></div>
            <div style={S.framePortrait}><span style={S.frameLabel}>9:16 · Shorts</span></div>
          </div>
        </section>

        <section style={{ ...S.section, paddingBottom: 40 }}>
          <div style={S.statRow}>
            {STATS.map((st) => (
              <div key={st.l} className="reveal" style={{ textAlign: "center" }}>
                <div className="count" data-target={st.v} data-suffix={st.s} style={S.statNum}>0{st.s}</div>
                <div style={{ color: "var(--muted)", marginTop: 6, fontSize: 14 }}>{st.l}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="reveal" style={S.ctaBand}>
          <h2 style={{ fontSize: "clamp(30px,4.5vw,52px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>Make your first video now.</h2>
          <p style={{ color: "rgba(255,255,255,0.85)", margin: "14px 0 30px" }}>Bring your own AI key. Free to try.</p>
          <Link href="/studio" style={S.ctaBtn}>Open Studio →</Link>
        </section>
      </main>

      <footer style={S.footer}>
        <span style={{ fontWeight: 800 }}>Reelify<span style={{ color: "var(--accent)" }}>.</span></span>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>Built for the Murf Buildathon</span>
      </footer>

      <style>{`.feat{transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease;} .feat:hover{transform:translateY(-6px); box-shadow:0 18px 50px rgba(120,90,60,.14); border-color:var(--accent);}`}</style>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  progress: { position: "fixed", top: 0, left: 0, height: 3, width: "100%", background: "linear-gradient(90deg,#e5532b,#e8923b)", transformOrigin: "left", transform: "scaleX(0)", zIndex: 60 },
  hero: { position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", paddingTop: 120 },
  heroFade: { position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse 70% 60% at 50% 46%, rgba(245,239,227,0.35), rgba(245,239,227,0.0) 40%, rgba(245,239,227,0.85) 100%)", pointerEvents: "none" },
  kickerTop: { color: "var(--accent)", fontWeight: 700, fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginBottom: 22 },
  h1: { fontSize: "clamp(40px, 6.6vw, 88px)", fontWeight: 800, lineHeight: 1.03, marginBottom: 24, letterSpacing: "-0.03em", color: "var(--ink)" },
  grad: { background: "linear-gradient(100deg,#e5532b,#e8923b)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" },
  lead: { fontSize: "clamp(16px,1.7vw,20px)", color: "var(--muted)", lineHeight: 1.65, maxWidth: 620, margin: "0 auto 30px" },
  primary: { background: "var(--accent)", color: "#fff", fontWeight: 700, padding: "15px 28px", borderRadius: 99, fontSize: 16, boxShadow: "0 12px 36px rgba(229,83,43,0.32)" },
  ghost: { color: "var(--ink)", fontWeight: 600, padding: "15px 26px", borderRadius: 99, border: "1px solid var(--line)", background: "var(--paper)", fontSize: 16 },
  scrollCue: { position: "absolute", bottom: 26, zIndex: 2, color: "var(--muted)", fontSize: 13, letterSpacing: 1 },

  marqueeWrap: { padding: "26px 0", background: "var(--bg-2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" },
  marqueeMask: { WebkitMaskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)", maskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)", overflow: "hidden" },
  chip: { padding: "11px 20px", border: "1px solid var(--line)", borderRadius: 99, color: "var(--ink)", fontSize: 15, whiteSpace: "nowrap", background: "var(--paper)" },
  chipAlt: { background: "rgba(229,83,43,0.06)", borderColor: "rgba(229,83,43,0.25)", color: "var(--accent)" },
  section: { maxWidth: 1040, margin: "0 auto", padding: "104px 24px", boxSizing: "content-box" },
  kicker: { color: "var(--accent)", fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" },
  h2: { fontSize: "clamp(30px,4.4vw,50px)", fontWeight: 800, textAlign: "center", margin: "12px 0 0", letterSpacing: "-0.025em", color: "var(--ink)" },

  step: { display: "flex", gap: 28, alignItems: "flex-start", padding: "28px 30px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 22, boxShadow: "0 6px 22px rgba(120,90,60,0.05)" },
  stepNum: { fontSize: 42, fontWeight: 800, color: "transparent", WebkitTextStroke: "1.5px #e5532b", lineHeight: 1, flexShrink: 0 } as React.CSSProperties,

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(226px,1fr))", gap: 18, marginTop: 52 },
  card: { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 20, padding: 26 },

  formats: { display: "flex", gap: 30, justifyContent: "center", alignItems: "center", marginTop: 54, flexWrap: "wrap" },
  frameLandscape: { width: 340, height: 191, borderRadius: 16, border: "1px solid var(--line)", background: "linear-gradient(135deg,#fff,#f0e7d6)", position: "relative", boxShadow: "0 20px 50px rgba(120,90,60,0.15)" },
  framePortrait: { width: 150, height: 267, borderRadius: 16, border: "1px solid var(--line)", background: "linear-gradient(135deg,#fff,#f6e3d8)", position: "relative", boxShadow: "0 20px 50px rgba(120,90,60,0.15)" },
  frameLabel: { position: "absolute", bottom: 12, left: 14, fontSize: 12, color: "var(--muted)", fontWeight: 600 },

  statRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, padding: "56px 30px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 24, boxShadow: "0 10px 36px rgba(120,90,60,0.06)" },
  statNum: { fontSize: "clamp(34px,5vw,56px)", fontWeight: 800, background: "linear-gradient(100deg,#e5532b,#e8923b)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", letterSpacing: "-0.02em" },

  ctaBand: { textAlign: "center", padding: "110px 24px", margin: "0 24px 24px", borderRadius: 30, background: "linear-gradient(120deg,#e5532b,#e8923b)", boxShadow: "0 30px 80px rgba(229,83,43,0.28)" },
  ctaBtn: { background: "#fff", color: "var(--ink)", fontWeight: 700, padding: "15px 28px", borderRadius: 99, fontSize: 16 },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "30px", borderTop: "1px solid var(--line)" },
};