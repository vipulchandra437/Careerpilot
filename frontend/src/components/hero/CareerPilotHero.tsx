import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Particle budget scales down on small / reduced-motion viewports.
const PARTICLE_COUNT = 900;
const MOBILE_COUNT = 480;
const REDUCED_COUNT = 300;
const SPAWN_RADIUS = 3.2;
const DPR_CAP = 1.5;

// Warm bronze + taupe + ivory palette (light particles floating on the dark card).
const PARTICLE_COLORS: number[] = [
  0xe8e0d4, // bone / ivory — the "canvas" color of the field
  0xd4c5b2, // parchment highlight
  0xc4a78a, // bronze
  0xc6bbad, // taupe / stone
  0xb7c5ce, // cool primary accent
];

const VERTEX_SHADER = `
uniform float uTime;
uniform vec2 uMouse;
uniform float uReduced;
uniform float uScale;
attribute float phase;
varying vec3 vColor;
void main() {
  vColor = color;
  vec3 p = position;
  if (uReduced < 0.5) {
    float t = uTime * 0.42 + phase;
    p += vec3(
      sin(t * 0.61 + phase) * 0.18,
      cos(t * 0.41 + phase * 0.71) * 0.12,
      sin(t * 0.51 + phase * 1.11) * 0.15
    );
  }
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mvPosition;
  gl_Position = clip;
  float size = (phase * 0.5 + 0.5) * 0.05 + 0.035;
  gl_PointSize = max(size * (uScale / -mvPosition.z), 1.0);
  if (uReduced < 0.5) {
    vec2 ndc = clip.xy / clip.w;
    vec2 d = (ndc - uMouse) * 5.0;
    float dist = length(d);
    float f = pow(1.0 - smoothstep(0.0, 0.6, dist), 2.2) * 0.32;
    if (dist > 0.0) gl_Position.xy += d * f;
  }
}
`;

const FRAGMENT_SHADER = `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.38, 0.5, d);
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor, a * 0.9);
}
`;

export interface HeroCTA {
  label: string;
  to: string;
}

export function CareerPilotHero({ cta }: { cta?: HeroCTA }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [supportsWebGL, setSupportsWebGL] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Fail gracefully — never throw in the effect.
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl")) as WebGL2RenderingContext | null;
    if (!gl) {
      setSupportsWebGL(false);
      return;
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const count = reduced
      ? REDUCED_COUNT
      : mobile
        ? MOBILE_COUNT
        : PARTICLE_COUNT;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true, // transparent → the card bg shows through
      antialias: true,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, reduced ? 1 : DPR_CAP),
    );
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(0, 0, 8);
    scene.add(camera);

    // --- geometry: particles on a shallow dome ---
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const tmp = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = Math.acos(2 * u - 1);
      const phi = Math.PI * 2 * v;
      const r = THREE.MathUtils.lerp(
        SPAWN_RADIUS * 0.5,
        SPAWN_RADIUS,
        Math.pow(Math.random(), 3),
      );
      tmp.setFromSphericalCoords(r, theta, phi);
      tmp.z -= 0.7; // bias toward the camera side of the dome
      positions[i * 3] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;
      const c = new THREE.Color(PARTICLE_COLORS[i % PARTICLE_COLORS.length]);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    geometry.computeBoundingSphere();
    if (geometry.boundingSphere) {
      geometry.boundingSphere.radius = SPAWN_RADIUS + 2;
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uReduced: { value: reduced ? 1 : 0 },
        uScale: { value: 1 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexColors: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // --- cursor tracking (NDC, smoothed with a light spring) ---
    const mouse = new THREE.Vector2(0, 0);
    const target = new THREE.Vector2(0, 0);
    const onPointerMove = (ev: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      target.set(x, y);
    };
    const onPointerLeave = () => target.set(0, 0);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);

    const sizeVec = new THREE.Vector2();
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, reduced ? 1 : DPR_CAP),
      );
      renderer.setSize(w, h, false);
      if (camera.aspect !== w / h) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      renderer.getSize(sizeVec);
      material.uniforms.uScale.value =
        (sizeVec.y * renderer.getPixelRatio()) /
        (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    };
    onResize();
    window.addEventListener("resize", onResize);

    // --- animate; pause the loop when the tab is hidden ---
    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;
    const animate = () => {
      if (!running || document.hidden) return;
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mouse.lerp(target, 0.14);
      material.uniforms.uTime.value = t;
      material.uniforms.uMouse.value.copy(mouse);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        void clock.getElapsedTime(); // re-seed after a hidden stretch
        raf = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      const lose = gl.getExtension?.("WEBGL_lose_context");
      lose?.loseContext?.();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      aria-label="Dashboard illustration"
      className={cn(
        "relative mb-8 overflow-hidden rounded-xl border border-border bg-surface",
        "shadow-soft h-[290px] w-full sm:h-[320px] md:h-[360px]",
      )}
    >
      {supportsWebGL && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 block h-full w-full"
          data-hero-canvas
        />
      )}
      <div className="relative z-10 flex h-full flex-col justify-end gap-4 p-6 md:p-8">
        <h2 className="font-display text-2xl tracking-tight text-fg md:text-3xl">
          Your career, quietly in motion.
        </h2>
        <p className="max-w-md text-sm text-muted">
          Resumes, interviews, and roadmaps collapse into one calm readiness plan.
        </p>
        {cta && (
          <Link to={cta.to} className="self-start">
            <Button variant="primary" size="md">
              {cta.label} →
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
}
