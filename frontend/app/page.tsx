import Link from "next/link";
import {
  Sparkles,
  BarChart3,
  Route,
  MessageSquareText,
  Target,
  ArrowRight,
  Github,
  FileText,
  Brain,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

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
    desc: "Maps your resume and GitHub profile against real job requirements to surface exactly what's missing.",
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

const steps = [
  {
    n: "01",
    title: "Connect your profile",
    desc: "Drop in your resume, link GitHub, or paste your LinkedIn — one snapshot of where you are now.",
  },
  {
    n: "02",
    title: "Get your skill map",
    desc: "AI compares you against target roles and pinpoints the gaps that matter for hiring.",
  },
  {
    n: "03",
    title: "Follow your roadmap",
    desc: "Learn, practice coding, run mock interviews, and track readiness as you level up.",
  },
];

const logos = [Github, FileText, Brain, ShieldCheck];

const metrics = [
  { value: "12k+", label: "career signals analyzed" },
  { value: "4x", label: "faster skill-gap identification" },
  { value: "94%", label: "students report clearer next steps" },
  { value: "1 hub", label: "resume, GitHub, roadmap, practice" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white antialiased">
      {/* Ambient gradient orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[44rem] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[130px]" />
        <div className="absolute right-[-10rem] top-1/3 h-[26rem] w-[26rem] rounded-full bg-violet-600/15 blur-[110px]" />
        <div className="absolute -left-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-cyan-500/10 blur-[110px]" />
        <div className="absolute inset-0 bg-hero-grid bg-[length:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_75%)]" />
      </div>

      {/* Sticky glass nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-sm font-black text-white shadow-glow-indigo">
              CP
            </span>
            <span className="text-base font-semibold tracking-tight text-white">
              Career Platform
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="focus-ring rounded-lg px-3.5 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="focus-ring hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white sm:block"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-primary focus-ring !px-4 !py-2 !text-sm"
            >
              Get Started
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-20 pt-20 text-center sm:pt-28">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-200">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          AI-assisted career development for CS students
        </div>

        <h1 className="animate-fade-up mt-6 max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Turn your <span className="text-gradient">CS skills</span> into a clear
          career path.
        </h1>

        <p className="animate-fade-up mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 [animation-delay:80ms] sm:text-lg">
          Analyze your resume and GitHub profile, map skill gaps against real job
          requirements, and follow a personalized AI roadmap to hire — from practice
          to interview readiness.
        </p>

        <div className="animate-fade-up mt-10 flex flex-col items-center gap-3 sm:flex-row [animation-delay:160ms]">
          <Link
            href="/signup"
            className="btn-primary focus-ring !px-7 !py-3.5 !text-base"
          >
            Start free — no card required
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="btn-secondary focus-ring !px-7 !py-3.5 !text-base"
          >
            See how it works
          </a>
        </div>

        {/* Logo/source badges */}
        <div className="animate-fade-up mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-500 [animation-delay:240ms]">
          <span className="flex items-center gap-2">
            <Github className="h-4 w-4" /> GitHub
          </span>
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Resume
          </span>
          <span className="flex items-center gap-2">
            <Brain className="h-4 w-4" /> LinkedIn
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Goal-driven
          </span>
        </div>

        <div className="animate-fade-up mt-12 grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4 [animation-delay:260ms]">
          {metrics.map((metric) => (
            <div key={metric.label} className="card border-white/10 bg-white/[0.02] p-4 text-left shadow-[0_12px_40px_-18px_rgba(99,102,241,0.65)]">
              <div className="text-2xl font-black tracking-tight text-white">{metric.value}</div>
              <div className="mt-1 text-sm text-slate-400">{metric.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-5 pb-24 sm:px-8"
      >
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
            How it works
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps from profile to hire-ready
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="card card-hover animate-fade-up p-7"
              style={{ animationDelay: `${Number(s.n[1]) * 70}ms` }}
            >
              <span className="text-gradient text-sm font-black tracking-widest">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 pb-24 sm:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
            Features
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            A career OS built for CS students
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-slate-400">
            Everything you need to go from coursework to confident candidate — in one place.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="card card-hover animate-fade-up flex flex-col p-6"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300">
                <f.icon aria-hidden="true" className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing / CTA */}
      <section
        id="pricing"
        className="relative mx-auto w-full max-w-5xl scroll-mt-24 px-5 pb-24 sm:px-8"
      >
        <div className="card animate-fade-up relative overflow-hidden p-10 text-center sm:p-14">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-brand"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to close your skill gaps?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-slate-400">
              Connect your GitHub, drop in your resume, and let Career Platform build
              your personalized path to hire — starting today.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="btn-primary focus-ring !px-7 !py-3.5 !text-base"
              >
                Get started free
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link href="/login" className="focus-ring !px-7 !py-3.5 !text-base">
                <span className="btn-secondary !border-0">I already have an account</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-white/[0.01]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:px-8">
          <p className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-brand text-[10px] font-black text-white">
              CP
            </span>
            Career Platform · AI-Powered for CS Students
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="focus-ring rounded text-xs transition-colors hover:text-slate-300"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="focus-ring rounded text-xs transition-colors hover:text-slate-300"
            >
              Privacy
            </Link>
            <ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-700" />
          </div>
        </div>
      </footer>
    </main>
  );
}