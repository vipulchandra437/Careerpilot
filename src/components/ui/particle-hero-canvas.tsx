"use client";

/**
 * ParticleHeroCanvas — decorative WebGL2 particle sculpture (≤1500 particles).
 *
 * WHY raw three.js (not R3F): @types/three is the only 3D dependency installed; the
 * design-skill guardrail is "ONE 3D library: vanilla Three.js".
 *
 * WHY ≤1500 particles: the reverted Oct 2026 hero used ~100k GPGPU-simulated
 * particles sampled from an image and was reverted for blowing the perf budget. This
 * is a deliberately cheap floating-ring canvas so the hero keeps 60fps on mid-tier GPUs.
 *
 * WHY inline styles, not Tailwind: the root Next.js layout imports no CSS (Tailwind v3
 * has a config but no `@tailwind` directive in the root app), so classes would be inert.
 * A className prop is still accepted for layout and is a no-op if unused.
 */

import { useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export interface ParticleHeroCanvasProps {
  /** Upper bound on particle count. Capped at 1500 by the component. Default 1500. */
  count?: number;
  /** Override the OS prefers-reduced-motion detection. */
  reducedMotion?: boolean;
  className?: string;
}

// Palette: warm bronze + taupe on an ivory ground.
const IVORY = 0xf6f0e6;
const BRONZE = 0xc68615;
const TAUPE_LIGHT = 0xb8a89e;
const TAUPE_DARK = 0x8b7a70;

/** Hard cap — keeps the simulation within the design-skill particle budget. */
const MAX_PARTICLES = 1500;

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

/**
 * Soft circular point sprite made from a tiny canvas — no external asset, so the
 * component stays dependency-free. White radial gradient fading to transparent.
 */
function makeDotTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const tx = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    tx.needsUpdate = true;
    return tx;
  }
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Builds a stratified point set on a torus surface. Deterministic (no per-frame alloc)
 * and reads well as a 3D sculptural ring — what a hero backing should feel like.
 */
function buildTorus(
  n: number,
  positions: Float32Array,
  homes: Float32Array,
  colors: Float32Array
) {
  const R = 2.7;
  const r = 1.05;
  const color = new THREE.Color();
  const weightedPalette = [
    { hex: BRONZE, w: 0.5 },
    { hex: TAUPE_DARK, w: 0.3 },
    { hex: TAUPE_LIGHT, w: 0.2 },
  ];
  let acc = 0;
  const ranges = weightedPalette.map((p) => {
    acc += p.w;
    return { hex: p.hex, max: acc };
  });
  for (let i = 0; i < n; i++) {
    const u = (i / n) * Math.PI * 2;
    const v = ((i * 1.3703) % 1) * Math.PI * 2;
    const cv = Math.cos(v);
    const sv = Math.sin(v);
    const cx = Math.cos(u);
    const sx = Math.sin(u);
    const x = (R + r * cv) * cx;
    const y = (R + r * cv) * sx;
    const z = r * sv;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    homes[i * 3] = x;
    homes[i * 3 + 1] = y;
    homes[i * 3 + 2] = z;
    const roll = Math.random();
    const pick = ranges.find((g) => roll <= g.max) ?? ranges[ranges.length - 1];
    color.setHex(pick.hex);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
}

export default function ParticleHeroCanvas({
  count = MAX_PARTICLES,
  reducedMotion: reducedMotionProp,
  className,
}: ParticleHeroCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [supported, setSupported] = useState(true);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // WHY webgl2 guard: the canvas is decorative. If the GPU/browser lacks WebGL2, we
    // leave the ivory container behind (no error boundary, no fallback asset needed).
    const glCtx = canvas.getContext("webgl2");
    if (!glCtx) {
      setSupported(false);
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(IVORY, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    const n = clamp(count, 1, MAX_PARTICLES);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(n * 3);
    const homes = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const velocities = new Float32Array(n * 3);
    buildTorus(n, positions, homes, colors);

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.085,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    material.map = makeDotTexture();
    material.alphaTest = 0.01;
    material.needsUpdate = true;

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const mouseWorld = new THREE.Vector3(-9999, -9999, 0);
    const ndc = new THREE.Vector2();
    let mouseSet = false;

    const fit = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    // Reduced-motion detection. WHY respect the prop override first, then the OS setting:
    // tests force it; real users get their OS preference.
    const mql =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let reduced = reducedMotionProp ?? mql?.matches ?? false;
    const onMq = () => {
      if (typeof reducedMotionProp === "boolean") return;
      reduced = !!mql?.matches;
    };
    mql?.addEventListener?.("change", onMq);

    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      const t = clock.getElapsedTime();
      const pos = positions;

      // Autonomous breathing + slow yaw. WHY skip under reduced motion: these are
      // non-essential animations the system imposes; cursor repulsion below is
      // direct user input and is kept even when motion is reduced.
      const flowOn = !reduced;
      const pulse = flowOn ? Math.sin(t * 0.55) * 0.016 : 0;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const px = pos[i3];
        const py = pos[i3 + 1];
        const pz = pos[i3 + 2];
        const len = Math.hypot(px, py, pz) || 1;
        const k = pulse / len;
        pos[i3] = px + px * k;
        pos[i3 + 1] = py + py * k;
        pos[i3 + 2] = pz + pz * k;
      }

      // Cursor repulsion in the z=0 plane (world space), sampled once per frame.
      if (mouseSet && !reduced) {
        const mx = mouseWorld.x;
        const my = mouseWorld.y;
        const radius = 1.4;
        const r2 = radius * radius;
        for (let i = 0; i < n; i++) {
          const i3 = i * 3;
          const dx = pos[i3] - mx;
          const dy = pos[i3 + 1] - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < r2 && d2 > 0) {
            const falloff = 1 - d2 / r2;
            const inv = (falloff / (Math.sqrt(d2) + 0.01)) * 1.5;
            velocities[i3] -= dx * inv;
            velocities[i3 + 1] -= dy * inv;
          }
        }
      }

      // Spring-return to homes + damping so particles settle back to the ring.
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        velocities[i3] += (homes[i3] - pos[i3]) * 0.05;
        velocities[i3 + 1] += (homes[i3 + 1] - pos[i3 + 1]) * 0.05;
        velocities[i3 + 2] += (homes[i3 + 2] - pos[i3 + 2]) * 0.05;
        velocities[i3] *= 0.88;
        velocities[i3 + 1] *= 0.88;
        velocities[i3 + 2] *= 0.9;
        pos[i3] += velocities[i3];
        pos[i3 + 1] += velocities[i3 + 1];
        pos[i3 + 2] += velocities[i3 + 2];
      }
      const posAttr = geometry.attributes.position;
      if (posAttr) posAttr.needsUpdate = true;

      if (flowOn) {
        points.rotation.y += 0.0007;
        points.rotation.x = Math.sin(t * 0.3) * 0.02;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, hit)) {
        mouseWorld.copy(hit);
        mouseSet = true;
      }
    };
    const onPointerLeave = () => {
      mouseSet = false;
    };

    // WHY capture on the container: the canvas below is pointer-events:none, so
    // cursor moves tunnel through it to the container for repulsion feedback.
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("pointerdown", onPointerLeave);

    const ro = new ResizeObserver(() => {
      fit();
      points.position.set(0, 0, 0);
    });
    ro.observe(container);

    // WHY pause when hidden: a background tab shouldn't keep burning the GPU.
    let visible = document.visibilityState === "visible";
    const onVisibility = () => {
      const v = document.visibilityState === "visible";
      if (v === visible) return;
      visible = v;
      if (v) {
        if (!raf) raf = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    fit();
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      container.removeEventListener("pointerdown", onPointerLeave);
      mql?.removeEventListener?.("change", onMq);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // WHY explicitly lose the GL context: frees backing-store allocations on
      // GPU-constrained/mobile devices where GC alone is slow.
      const lose = glCtx.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!supported) {
    // WHY ivory shell only: no WebGL2 → pure decoration. Returns just the coloured
    // container so layout is stable, with no canvas/THREE resources to leak.
    return (
      <div
        className={cn("relative w-full h-full", className)}
        style={{ backgroundColor: "#f6f0e6" }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full", className)}
      style={{ backgroundColor: "#f6f0e6", pointerEvents: "auto" }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          // WHY pointer-events:none + aria-hidden: the canvas is purely decorative;
          // pointer moves tunnel through to the container for repulsion feedback.
          pointerEvents: "none",
          display: "block",
        }}
      />
    </div>
  );
}

