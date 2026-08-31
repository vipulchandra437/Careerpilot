import Link from "next/link";
import { Sparkles, BarChart3, Route, MessageSquareText, Target } from "lucide-react";

const codeTexture = [
  "def analyze_profile(skills):",
  "  gaps = gap_analysis(skills)",
  '  return roadmap_for(gaps)',
  "const roadmap = buildPhasePipeline()",
  "await mockInterview(model='gpt-4o')",
  "import { skillGapMatrix } from '@/lib/analysis'",
  "jobs.map(j => j.required_skills)",
  "resume.merge(github, linkedin)",
  "score = normalized_match(gaps)",
  "while progress < hired: advance()",
  "skills.sort(key=lambda s: s.priority)",
  "roadmap.phases = [learn, practice, apply]",
];

function CodeSnippet({ code, top, left, rotate, scale, opacity, width }: {
  code: string;
  top: string;
  left: string;
  rotate: number;
  scale: number;
  opacity: number;
  width: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="absolute font-mono text-sm leading-5 tracking-tight text-blue-300 select-none"
      style={{
        top,
        left,
        transform: `rotate(${rotate}deg) scale(${scale})`,
        opacity,
        width,
        wordBreak: "break-all",
      }}
    >
      <span className="text-cyan-400">{code.slice(0, code.indexOf("(") + 1)}</span>
      <span>{code.slice(code.indexOf("(") + 1)}</span>
    </div>
  );
}

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

const features = [
  {
    icon: Target,
    title: "Skill Gap Analysis",
    desc: "Career Platform maps your resume and GitHub profile against real job requirements to surface exactly what's missing.",
  },
  {
    icon: Route,
    title: "Personalized Roadmaps",
    desc: "A step-by-step, AI-built learning path that closes your gaps in priority order — no generic checklist.",
  },
  {
    icon: MessageSquareText,
    title: "Mock Interviews",
    desc: "Practice with an AI interviewer that adapts to your level and gives honest, actionable feedback.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    desc: "See your skill coverage and readiness evolve as you work through your roadmap, with a live profile hub.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0e17] text-white antialiased">
      {/* Ambient glow canvas */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute -left-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute -right-24 top-2/3 h-[26rem] w-[26rem] rounded-full bg-indigo-600/10 blur-[110px]" />
      </div>

      {/* Top nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-black text-white shadow-lg shadow-blue-600/40">
            CP
          </span>
          <span className="text-base font-semibold tracking-tight">Career Platform</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/signup"
          className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/50 hover:brightness-110"
        >
          Get Started
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pt-6 pb-16 text-center sm:pt-10">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Turn your <span className="text-white">CS skills</span>{" "}
          <span className="font-light text-slate-400">into a clear career path.</span>
        </h1>

        <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
          Career Platform analyzes your resume &amp; GitHub profile, maps skill gaps against real job
          requirements, and builds your roadmap to hire.
        </p>

        <div className="mt-8">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/60 hover:brightness-110"
          >
            <Sparkles
              aria-hidden="true"
              className="h-5 w-5 transition-transform group-hover:rotate-12"
            />
            Get Started
          </Link>
        </div>

        {/* Glowing centerpiece logo mark */}
        <div className="relative mt-16">
          {/* glow halo */}
          <div
            aria-hidden="true"
            className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-blue-500/50 via-cyan-400/40 to-indigo-500/50 blur-2xl"
          />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_0_60px_-10px_rgba(59,130,246,0.8)] sm:h-36 sm:w-36">
            <span className="text-5xl font-black text-white sm:text-6xl">CP</span>
          </div>
        </div>
      </section>

      {/* Scattered code texture */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {codeTexture.map((c, i) => (
          <CodeSnippet
            key={i}
            code={c}
            top={["12%", "22%", "30%", "44%", "56%", "64%", "76%", "86%", "18%", "72%", "38%", "60%"][i]}
            left={["4%", "78%", "12%", "82%", "6%", "88%", "16%", "70%", "48%", "30%", "60%", "42%"][i]}
            rotate={[-4, 3, -2, 4, -3, 2, -5, 3, 2, -2, 3, -1][i]}
            scale={[0.8, 0.95, 0.7, 1.05, 0.75, 0.9, 0.7, 1.0, 0.6, 0.85, 0.65, 0.78][i]}
            opacity={[0.05, 0.045, 0.06, 0.04, 0.055, 0.05, 0.045, 0.06, 0.05, 0.04, 0.055, 0.05][i]}
            width={["16rem", "15rem", "14rem", "17rem", "15rem", "16rem", "13rem", "18rem", "15rem", "14rem", "16rem", "15rem"][i]}
          />
        ))}
      </div>

      {/* Feature cards */}
      <section id="features" className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-5 pb-24 pt-8 sm:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What it does</h2>
          <p className="mt-3 text-slate-400">
            An AI-assisted career OS built specifically for CS students.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/40 hover:bg-white/[0.06]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-400/20 text-blue-300">
                <f.icon aria-hidden="true" className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section id="pricing" className="mx-auto w-full max-w-4xl scroll-mt-24 px-5 pb-20 pt-4 text-center sm:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/15 via-transparent to-cyan-500/10 p-10 sm:p-14">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to close your skill gaps?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Connect your GitHub, drop in your resume, and let Career Platform build your personalized
            path to hire.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/60 hover:brightness-110"
            >
              <Sparkles
                aria-hidden="true"
                className="h-5 w-5 transition-transform group-hover:rotate-12"
              />
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom bar */}
      <footer className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-4 text-xs text-slate-400 sm:flex-row sm:px-8">
          <p>AI-Powered Career Platform for CS Students</p>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 text-[9px] font-black text-white">
              CP
            </span>
            <span>Career Platform</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
