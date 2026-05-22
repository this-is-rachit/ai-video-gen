// components/InteractiveField.tsx
"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function InteractiveField({
  density = 0.32, dotSize = 0.09, opacity = 0.85, radius = 1.5,
}: { density?: number; dotSize?: number; opacity?: number; radius?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 8;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    // soft round dot sprite
    const cv = document.createElement("canvas"); cv.width = cv.height = 64;
    const cx = cv.getContext("2d")!;
    const g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = g; cx.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(cv);

    const cA = new THREE.Color("#e5532b"), cB = new THREE.Color("#4e7c6b"), cC = new THREE.Color("#e8923b");

    let home = new Float32Array(0), positions = new Float32Array(0), geo: THREE.BufferGeometry, points: THREE.Points;

    const visH = () => 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const build = () => {
      const h = visH() * 1.15, w = h * camera.aspect;
      const cols = Math.ceil(w / density), rows = Math.ceil(h / density);
      const n = cols * rows;
      home = new Float32Array(n * 3); positions = new Float32Array(n * 3);
      const colors = new Float32Array(n * 3);
      let k = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = -w / 2 + c * density + (Math.random() - 0.5) * density * 0.6;
        const y = -h / 2 + r * density + (Math.random() - 0.5) * density * 0.6;
        home[k * 3] = x; home[k * 3 + 1] = y; home[k * 3 + 2] = 0;
        positions[k * 3] = x; positions[k * 3 + 1] = y; positions[k * 3 + 2] = 0;
        const m = Math.random(); const col = m < 0.55 ? cA : m < 0.8 ? cB : cC;
        colors[k * 3] = col.r; colors[k * 3 + 1] = col.g; colors[k * 3 + 2] = col.b;
        k++;
      }
      if (points) { scene.remove(points); geo.dispose(); }
      geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      points = new THREE.Points(geo, new THREE.PointsMaterial({
        size: dotSize, map: sprite, vertexColors: true, transparent: true, opacity, depthWrite: false, blending: THREE.NormalBlending,
      }));
      scene.add(points);
    };
    build();

    // mouse → world plane at z=0
    let ndc = new THREE.Vector2(99, 99);
    const mouseWorld = new THREE.Vector3(999, 999, 0);
    const updateMouseWorld = () => {
      const v = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera);
      const dir = v.sub(camera.position).normalize();
      const dist = -camera.position.z / dir.z;
      mouseWorld.copy(camera.position).add(dir.multiplyScalar(dist));
    };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    const onLeave = () => { ndc.set(99, 99); };
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    let raf = 0, t = 0;
    const R2 = radius * radius;
    const animate = () => {
      t += 0.016; updateMouseWorld();
      const arr = geo.attributes.position.array as Float32Array;
      const n = arr.length / 3;
      for (let i = 0; i < n; i++) {
        const hx = home[i * 3], hy = home[i * 3 + 1];
        let tx = hx + Math.sin(t * 0.6 + i) * 0.05;
        let ty = hy + Math.cos(t * 0.5 + i * 1.3) * 0.05;
        const dx = tx - mouseWorld.x, dy = ty - mouseWorld.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) { const d = Math.sqrt(d2) || 0.001; const f = (radius - d) / radius; tx += (dx / d) * f * radius * 0.95; ty += (dy / d) * f * radius * 0.95; }
        arr[i * 3] += (tx - arr[i * 3]) * 0.09;
        arr[i * 3 + 1] += (ty - arr[i * 3 + 1]) * 0.09;
      }
      geo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight); build();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("mouseleave", onLeave);
      renderer.dispose(); sprite.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, [density, dotSize, opacity, radius]);

  return <div ref={ref} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}