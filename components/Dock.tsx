// components/Dock.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";

type Link = { label: string; href: string };
export default function Dock({ links, cta }: { links: Link[]; cta: Link }) {
  const [compact, setCompact] = useState(false);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const el = ctaRef.current;
    if (!el) return () => window.removeEventListener("scroll", onScroll);
    const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3" });
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.5);
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener("mousemove", move); el.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div style={{ position: "fixed", top: compact ? 12 : 22, left: "50%", transform: "translateX(-50%)", zIndex: 50, transition: "top .35s ease", width: "min(940px, calc(100% - 32px))" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: compact ? "8px 10px 8px 20px" : "12px 12px 12px 24px",
        borderRadius: 99, background: "rgba(255,253,248,0.72)", backdropFilter: "blur(16px)",
        border: "1px solid var(--line)", boxShadow: compact ? "0 12px 40px rgba(120,90,60,0.18)" : "0 6px 24px rgba(120,90,60,0.10)",
        transition: "all .35s ease",
      }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em" }}>
          Reelify<span style={{ color: "var(--accent)" }}>.</span>
        </Link>
        <nav style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {links.map((l) => <a key={l.href} href={l.href} className="dock-link">{l.label}</a>)}
          <Link ref={ctaRef as any} href={cta.href} style={{
            marginLeft: 6, background: "var(--ink)", color: "var(--paper)", fontWeight: 600, fontSize: 14,
            padding: compact ? "9px 16px" : "11px 18px", borderRadius: 99, whiteSpace: "nowrap", transition: "padding .35s ease",
          }}>{cta.label}</Link>
        </nav>
      </div>
      <style>{`
        .dock-link { color: var(--muted); font-size: 14px; font-weight: 500; padding: 9px 14px; border-radius: 99px; position: relative; transition: color .2s; }
        .dock-link:hover { color: var(--ink); }
        @media (max-width: 640px){ .dock-link{ display:none; } }
      `}</style>
    </div>
  );
}