import { useEffect, useRef } from "react"

type Grain = { x: number; y: number; vx: number; vy: number; settled: boolean }

export default function SandSimulation({ count = 2200 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const mouse = { x: -9999, y: -9999, down: false }
    const RADIUS = 110
    let width = 0
    let height = 0
    let grains: Grain[] = []
    let raf = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const ratio = window.devicePixelRatio || 1
      canvas.width = width * ratio
      canvas.height = height * ratio
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      // grains start high and fall onto a floor, forming a heap
      grains = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.5,
        vx: 0,
        vy: 0,
        settled: false,
      }))
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const floor = height - 6
      const gravity = 0.25

      for (const g of grains) {
        // cursor pushes nearby grains away
        const dx = g.x - mouse.x
        const dy = g.y - mouse.y
        const dist = Math.hypot(dx, dy)
        if (dist < RADIUS && dist > 0) {
          const force = (RADIUS - dist) / RADIUS
          g.vx += (dx / dist) * force * 1.6
          g.vy += (dy / dist) * force * 1.6
          g.settled = false
        }

        // gravity: grains fall until they hit the floor or another grain
        if (!g.settled) {
          g.vy += gravity
          g.vx *= 0.92
          g.vy *= 0.98
          g.x += g.vx
          g.y += g.vy
          if (g.y >= floor) {
            g.y = floor
            g.vy = 0
            g.vx *= 0.5
            if (Math.abs(g.vx) < 0.05) {
              g.vx = 0
              g.settled = true
            }
          }
          if (g.x < 0) { g.x = 0; g.vx = -g.vx * 0.4 }
          if (g.x > width) { g.x = width; g.vx = -g.vx * 0.4 }
        }

        // colour: golden sand, warm orange where the cursor is disturbing it
        const near = dist < RADIUS
        ctx.fillStyle = near ? "#e07a2e" : "#d9a441"
        ctx.beginPath()
        ctx.arc(g.x, g.y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerleave", onLeave)
    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("resize", resize)
    }
  }, [count])

  return <canvas ref={canvasRef} className="block h-full w-full" />
}