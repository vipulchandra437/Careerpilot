"use client";

/*
 * JourneyMap ("Graphify") — the interactive 3D route map.
 *
 * React owns the overlay UI (hero, progress, info panel) as state; Three.js
 * owns the canvas. The port keeps the original scene 1:1 (terrain, winding
 * amber route, eight flags) while fixing the CDN-script approach for Next.js:
 *
 * - WHY dynamic import inside useEffect: three is ~600 kB; lazy-loading it
 *   keeps it out of the first-load bundle AND keeps SSR free of WebGL.
 * - WHY npm three instead of the r128 CDN script: versioned dependency,
 *   tree-shakeable, no third-party runtime request.
 * - WHY stops carry real hrefs: every pin opens a feature that actually
 *   exists (signed-out visitors bounce through /login via middleware).
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type * as ThreeNS from "three";

import styles from "./journey-map.module.css";

/** One stop on the route — a flag in the scene and a card in the panel. */
export type JourneyStop = {
  title: string;
  desc: string;
  /** Where the panel's "Open" button navigates. */
  href: string;
};

/** Optional call-to-action buttons rendered under the hero subtitle. */
export type JourneyAction = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
};

type JourneyMapProps = {
  stops?: JourneyStop[];
  title?: string;
  subtitle?: string;
  actions?: JourneyAction[];
  brandLabel?: string;
  brandHref?: string;
  showHint?: boolean;
};

// WHY these 8: exactly one stop per shipped feature, each wired to its real
// dashboard route so the map doubles as the product tour.
const DEFAULT_STOPS: JourneyStop[] = [
  {
    title: "Roadmap",
    desc: "A day-by-day study plan tailored to where you're starting from and how much time you have.",
    href: "/dashboard/roadmap",
  },
  {
    title: "Resume Builder",
    desc: "Build a resume from scratch with a live preview, then export straight to a clean, recruiter-ready PDF.",
    href: "/dashboard/builder",
  },
  {
    title: "Resume Analyzer",
    desc: "Upload an existing resume and get a scored breakdown of strengths, weaknesses, and concrete fixes.",
    href: "/dashboard",
  },
  {
    title: "GitHub Analysis",
    desc: "See how your repositories, commit history, and READMEs read to someone screening candidates.",
    href: "/dashboard/github",
  },
  {
    title: "Target Company",
    desc: "Pick a company and role — your practice and interviews adapt to how they actually hire.",
    href: "/dashboard/target",
  },
  {
    title: "Coding Test",
    desc: "Timed challenges modeled on real screening rounds, so the first one you sit isn't the first one you've seen.",
    href: "/dashboard/practice",
  },
  {
    title: "Mock Interview",
    desc: "Practice with an AI interviewer that adapts questions to your target role and gives feedback after each round.",
    href: "/dashboard/interview",
  },
  {
    title: "Mentor Chat",
    desc: "Ask specific questions about your search and get grounded answers, not generic career advice.",
    href: "/dashboard/mentor",
  },
];

// Hand-placed waypoints so the route winds across the terrain.
const WAYPOINTS: Array<[number, number]> = [
  [-7.2, -4.2],
  [-4.4, -0.8],
  [-7.0, 2.6],
  [-3.0, 4.8],
  [0.2, 1.2],
  [3.4, 4.4],
  [6.2, 1.4],
  [7.4, -3.2],
];

// Palette mirrors the app's design tokens (globals.css). The terrain sits one
// shade darker than the page so the map reads as an object ON the surface, with
// fog fading its edges out. The canvas can't read CSS variables, so we pick the
// palette at init from the <html class="dark"> flag (same source as globals).
const LIGHT_COLORS = {
  paper: "#faf6ef",
  terrain: "#efe7d2",
  card: "#fbf8ef",
  ink: "#1a2332",
  amber: "#d97706",
} as const;

const DARK_COLORS = {
  paper: "#0f1419",
  terrain: "#161e2b",
  card: "#1a2332",
  ink: "#fbf8ef",
  amber: "#d97706",
} as const;

const isDarkMode = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

const SERIF_STACK = 'Georgia, ui-serif, "Times New Roman", serif';

export default function JourneyMap({
  stops = DEFAULT_STOPS,
  title = "Your path to hired, laid out.",
  subtitle = "Eight stops on one route. Drag to turn the map, click a stop to open it.",
  actions,
  brandLabel = "CareerPilot",
  brandHref = "/",
  showHint = true,
}: JourneyMapProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  // WHY a ref alongside state: the Three.js event closures and the per-frame
  // animation read the current selection without re-mounting the scene.
  const selectedRef = useRef<number | null>(null);
  const selectStop = useCallback((index: number | null) => {
    selectedRef.current = index;
    setSelected(index);
  }, []);

  // Escape closes the info panel (keyboard parity with clicking away).
  useEffect(() => {
    if (selected === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") selectStop(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, selectStop]);

  // The scene lives and dies with this effect: every listener, the RAF loop,
  // every geometry/material/texture and the renderer itself are torn down on
  // unmount (dev StrictMode double-mount safe).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let disposed = false;
    let teardown: (() => void) | null = null;

    (async () => {
      let THREE: typeof ThreeNS;
      try {
        THREE = await import("three");
      } catch {
        if (!disposed) setWebglFailed(true);
        return;
      }
      if (disposed || !wrapRef.current) return;

      // WHY resolved here: the canvas textures can't read CSS, so we snapshot the
      // active palette once at init from the same <html class="dark"> flag that
      // drives globals.css. Recomputed on every mount (StrictMode-safe).
      const colors = isDarkMode() ? DARK_COLORS : LIGHT_COLORS;

      // -- canvas-generated textures (graph-paper terrain, painted flags) --

      function wrapText(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
      ) {
        const words = text.split(" ");
        let line = "";
        let curY = y;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            ctx.fillText(line, x, curY);
            line = words[n] + " ";
            curY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, curY);
      }

      function makeTerrainTexture(): ThreeNS.CanvasTexture {
        const size = 1024;
        const textureCanvas = document.createElement("canvas");
        textureCanvas.width = size;
        textureCanvas.height = size;
        const ctx = textureCanvas.getContext("2d");
        if (!ctx) throw new Error("2D canvas context unavailable");

        ctx.fillStyle = colors.terrain;
        ctx.fillRect(0, 0, size, size);

        // fine dot grid (graph-paper feel)
        ctx.fillStyle = "rgba(26, 35, 50, 0.08)";
        const gridStep = 34;
        for (let x = gridStep; x < size; x += gridStep) {
          for (let y = gridStep; y < size; y += gridStep) {
            ctx.fillRect(x, y, 2, 2);
          }
        }

        // loose topographic-style contour blobs
        ctx.strokeStyle = "rgba(26, 35, 50, 0.09)";
        ctx.lineWidth = 2;
        const blobs = [
          { cx: 300, cy: 250, r: 90 },
          { cx: 700, cy: 300, r: 130 },
          { cx: 500, cy: 700, r: 160 },
          { cx: 820, cy: 720, r: 90 },
          { cx: 180, cy: 650, r: 110 },
        ];
        blobs.forEach((b) => {
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(b.cx, b.cy, b.r + i * 26, 0, Math.PI * 2);
            ctx.stroke();
          }
        });

        // grain
        for (let i = 0; i < 2200; i++) {
          ctx.fillStyle = `rgba(26, 35, 50, ${Math.random() * 0.02})`;
          ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
        }

        const tex = new THREE.CanvasTexture(textureCanvas);
        // WHY sRGB: three r152+ treats texture color spaces explicitly; without
        // this the hand-painted canvas looks washed out next to the CSS UI.
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        return tex;
      }

      function makeFlagTexture(stop: JourneyStop, index: number): ThreeNS.CanvasTexture {
        const w = 340;
        const h = 240;
        const textureCanvas = document.createElement("canvas");
        textureCanvas.width = w;
        textureCanvas.height = h;
        const ctx = textureCanvas.getContext("2d");
        if (!ctx) throw new Error("2D canvas context unavailable");

        ctx.fillStyle = colors.card;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(26, 35, 50, 0.35)";
        ctx.lineWidth = 3;
        ctx.strokeRect(6, 6, w - 12, h - 12);

        ctx.fillStyle = "rgba(26, 35, 50, 0.45)";
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillText(`STOP ${String(index + 1).padStart(2, "0")}`, 22, 40);

        ctx.fillStyle = colors.amber;
        ctx.fillRect(22, 56, 34, 3);

        ctx.fillStyle = colors.ink;
        ctx.font = `600 30px ${SERIF_STACK}`;
        wrapText(ctx, stop.title, 22, 100, w - 44, 34);

        const tex = new THREE.CanvasTexture(textureCanvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        return tex;
      }

      // -- scene (the WebGLRenderer constructor throws without WebGL) -------

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(colors.paper);
      scene.fog = new THREE.Fog(new THREE.Color(colors.paper), 16, 30);

      const camera = new THREE.PerspectiveCamera(
        38,
        window.innerWidth / window.innerHeight,
        0.1,
        100,
      );
      camera.position.set(0, 10.5, 12.5);
      camera.lookAt(0, 0, 0);

      let renderer: ThreeNS.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch {
        if (!disposed) setWebglFailed(true);
        return;
      }
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const canvas = renderer.domElement;
      wrap.appendChild(canvas);

      // WHY the higher intensities: three r155+ uses physically-correct light
      // units by default; r128-era 0.8/0.9 values render nearly black now.
      const ambient = new THREE.AmbientLight(0xffffff, 1.1);
      scene.add(ambient);
      const sun = new THREE.DirectionalLight(0xfff2e0, 1.4);
      sun.position.set(5, 10, 4);
      scene.add(sun);
      const rim = new THREE.DirectionalLight(0xd97706, 0.35);
      rim.position.set(-8, 3, -6);
      scene.add(rim);

      const world = new THREE.Group();
      scene.add(world);

      // terrain
      const terrain = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 14, 1, 1),
        new THREE.MeshStandardMaterial({ map: makeTerrainTexture(), roughness: 0.95 }),
      );
      terrain.rotation.x = -Math.PI / 2;
      world.add(terrain);

      // route tube through the waypoints (slightly raised off the paper)
      const curvePoints = WAYPOINTS.map(([x, z]) => new THREE.Vector3(x, 0.03, z));
      const pathCurve = new THREE.CatmullRomCurve3(curvePoints);
      world.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(pathCurve, 200, 0.035, 8, false),
          new THREE.MeshBasicMaterial({ color: colors.amber }),
        ),
      );

      // markers: pole + amber base + painted flag, one per stop
      const markers: ThreeNS.Mesh[] = [];
      stops.forEach((stop, index) => {
        const [x, z] = WAYPOINTS[index % WAYPOINTS.length];
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const poleHeight = 1.1;
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, poleHeight, 8),
          new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.6 }),
        );
        pole.position.y = poleHeight / 2;
        group.add(pole);

        const base = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 16, 16),
          new THREE.MeshStandardMaterial({ color: colors.amber, roughness: 0.4 }),
        );
        base.position.y = 0.02;
        group.add(base);

        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(1.0, 0.7),
          new THREE.MeshStandardMaterial({
            map: makeFlagTexture(stop, index),
            side: THREE.DoubleSide,
            roughness: 0.85,
          }),
        );
        flag.position.y = poleHeight + 0.36;
        flag.userData = { index, baseY: flag.position.y };
        group.add(flag);
        markers.push(flag);

        world.add(group);
      });

      // -- interaction ------------------------------------------------------

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let worldRotation = 0;
      let targetWorldRotation = 0;
      // WHY: continuous ambient rotation is motion; honour the OS setting.
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let autoRotate = !reduceMotion;
      let isDragging = false;
      let dragMoved = false;
      let lastPointerX = 0;
      let hoveredIndex = -1;

      function updatePointer(event: { clientX: number; clientY: number }) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      }

      function hitMarker(): number {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(markers, false);
        return hits.length > 0 ? (hits[0].object.userData.index as number) : -1;
      }

      function onPointerDown(event: PointerEvent) {
        isDragging = true;
        dragMoved = false;
        autoRotate = false;
        lastPointerX = event.clientX;
        canvas.style.cursor = "grabbing";
      }

      function onPointerMove(event: PointerEvent) {
        updatePointer(event);
        if (isDragging) {
          const dx = event.clientX - lastPointerX;
          if (Math.abs(dx) > 2) dragMoved = true;
          targetWorldRotation += dx * 0.005;
          lastPointerX = event.clientX;
        } else {
          hoveredIndex = hitMarker();
          canvas.style.cursor = hoveredIndex !== -1 ? "pointer" : "grab";
        }
      }

      function onPointerUp() {
        isDragging = false;
        canvas.style.cursor = hoveredIndex !== -1 ? "pointer" : "grab";
      }

      function onClick(event: MouseEvent) {
        if (dragMoved) return; // a drag that ends on a flag is not a click
        updatePointer(event);
        const index = hitMarker();
        if (index !== -1) {
          selectStop(index);
        } else if (selectedRef.current !== null) {
          selectStop(null);
        }
      }

      function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("click", onClick);
      window.addEventListener("resize", onResize);

      // -- frame loop -------------------------------------------------------

      let frameHandle = 0;
      const animate = () => {
        frameHandle = requestAnimationFrame(animate);

        if (autoRotate) targetWorldRotation += 0.0012;
        worldRotation += (targetWorldRotation - worldRotation) * 0.06;
        world.rotation.y = worldRotation;

        const currentSelection = selectedRef.current;
        markers.forEach((flag, index) => {
          flag.lookAt(camera.position);
          const isHovered = index === hoveredIndex;
          const isSelected = index === currentSelection;
          const targetScale = isSelected ? 1.25 : isHovered ? 1.1 : 1;
          const targetY = (flag.userData.baseY as number) + (isHovered || isSelected ? 0.1 : 0);
          flag.scale.x += (targetScale - flag.scale.x) * 0.12;
          flag.scale.y += (targetScale - flag.scale.y) * 0.12;
          flag.position.y += (targetY - flag.position.y) * 0.12;
        });

        renderer.render(scene, camera);
      };
      animate();

      // -- full teardown: listeners, loop, GPU resources, DOM ---------------

      teardown = () => {
        cancelAnimationFrame(frameHandle);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("click", onClick);
        window.removeEventListener("resize", onResize);
        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if (
              material instanceof THREE.MeshStandardMaterial ||
              material instanceof THREE.MeshBasicMaterial
            ) {
              material.map?.dispose();
            }
            material.dispose();
          }
        });
        renderer.dispose();
        canvas.remove();
      };
    })();

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [stops, selectStop]);

  // -- render (overlay UI is plain React; the canvas is Three's) -----------

  const selectedStop = selected !== null ? stops[selected] : null;

  return (
    <div className={styles.stage}>
      <div ref={wrapRef} className={styles.canvasWrap} aria-hidden="true" />

      {/* hero: top-left copy + optional CTAs (landing passes auth actions) */}
      <div className={styles.hero}>
        <Link href={brandHref} className={styles.eyebrow}>
          {brandLabel}
        </Link>
        <h1 className={styles.heroTitle}>{title}</h1>
        <p className={styles.heroSubtitle}>{subtitle}</p>
        {actions && actions.length > 0 && (
          <div className={styles.actions}>
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={action.variant === "primary" ? styles.actionPrimary : styles.actionSecondary}
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* progress: which stop is open right now */}
      <div className={styles.progress}>
        Viewing stop
        <br />
        <span className={styles.step}>
          {selected !== null
            ? `${String(selected + 1).padStart(2, "0")} / ${String(stops.length).padStart(2, "0")}`
            : "—"}
        </span>
      </div>

      {showHint && (
        <div className={styles.hint}>
          <span className={styles.key}>drag</span> to turn&nbsp;&nbsp;·&nbsp;&nbsp;
          <span className={styles.key}>click</span> a pin
        </div>
      )}

      {/* info panel: opens on a flag click, closes via ×, Escape, or empty click */}
      <div
        className={selectedStop ? `${styles.panel} ${styles.panelVisible}` : styles.panel}
        role="dialog"
        aria-modal="false"
        aria-label={selectedStop ? `${selectedStop.title} details` : undefined}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => selectStop(null)}
          aria-label="Close panel"
        >
          ×
        </button>
        <div className={styles.rule} />
        {selectedStop && selected !== null && (
          <>
            <div className={styles.stopLabel}>
              Stop {String(selected + 1).padStart(2, "0")} of{" "}
              {String(stops.length).padStart(2, "0")}
            </div>
            <h2 className={styles.panelTitle}>{selectedStop.title}</h2>
            <p className={styles.panelDesc}>{selectedStop.desc}</p>
            <Link href={selectedStop.href} className={styles.openBtn}>
              Open {selectedStop.title}
            </Link>
          </>
        )}
      </div>

      {/* graceful fallback if WebGL/the dynamic import fails */}
      {webglFailed && (
        <div className={styles.fallback}>
          <h2 className={styles.fallbackTitle}>Every stop, one click away</h2>
          <p className={styles.fallbackNote}>
            Your browser couldn&apos;t show the 3D map, but all {stops.length} stops work.
          </p>
          <ul className={styles.fallbackList}>
            {stops.map((stop, index) => (
              <li key={stop.href}>
                <Link href={stop.href} className={styles.fallbackLink}>
                  {String(index + 1).padStart(2, "0")} · {stop.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* WHY sr-only nav: the WebGL canvas is aria-hidden, so screen readers
          (and crawlers) get a real semantic list of every stop instead. */}
      <nav className={styles.srOnly} aria-label="All stops on the journey map">
        <h2>Every stop on the route</h2>
        <ul>
          {stops.map((stop, index) => (
            <li key={stop.href}>
              <Link href={stop.href}>
                {String(index + 1).padStart(2, "0")}. {stop.title}
              </Link>{" "}
              — {stop.desc}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
