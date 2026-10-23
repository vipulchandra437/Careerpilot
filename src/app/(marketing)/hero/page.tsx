import SculptureHero from "@/components/ui/liquid-sculpture-hero"

/**
 * Demo route for the self-contained WebGL2 liquid-sculpture hero.
 * Reachable at /hero (a filesystem route; the afterFiles catch-all
 * rewrite in next.config.mjs does not override defined pages).
 */
export default function SculptureHeroDemoPage() {
  return <SculptureHero />
}
