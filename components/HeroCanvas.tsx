// components/HeroCanvas.tsx
"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 6.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const mesh = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.4, 1)),
      new THREE.LineBasicMaterial({ color: 0xff5c38, transparent: true, opacity: 0.28 })
    );
    const inner = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.45, 0)),
      new THREE.LineBasicMaterial({ color: 0xffb23f, transparent: true, opacity: 0.35 })
    );
    group.add(mesh, inner);

    const N = 420;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 20;
    const points = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
      new THREE.PointsMaterial({ color: 0xffd27f, size: 0.022, transparent: true, opacity: 0.5 })
    );
    scene.add(points);

    let mx = 0, my = 0;
    const onMove = (e: MouseEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    const animate = () => {
      mesh.rotation.x += 0.0012; mesh.rotation.y += 0.0018;
      inner.rotation.x -= 0.0022; inner.rotation.y -= 0.0016;
      points.rotation.y += 0.0004;
      camera.position.x += (mx * 1.4 - camera.position.x) * 0.035;
      camera.position.y += (-my * 1.4 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}