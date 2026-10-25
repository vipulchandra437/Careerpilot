import { createFileRoute, Link } from "@tanstack/react-router";
import SandSimulation from "@/components/hero/SandSimulation";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#faf7f0] text-[#1d2a44] antialiased">
      {/* Hero — sand simulation fills the viewport band */}
      <div className="relative h-[60vh] w-full overflow-hidden sm:h-[45vh]">
        <SandSimulation />
      </div>

      {/* Headline + CTAs */}
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          Get job-ready, one grain at a time.
        </h1>
        <p className="mt-6 text-lg text-[#4a5a73]">
          Build your resume, practise interviews, and track your readiness in one place.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/register">
            <Button
              variant="accent"
              size="lg"
              className="w-full bg-[#e07a2e] text-white hover:bg-[#c76a1d] active:scale-[0.98] sm:w-auto"
            >
              Get started
            </Button>
          </Link>
          <Link to="/login">
            <Button
              variant="ghost"
              size="lg"
              className="w-full border-[#d9a441]/30 text-[#1d2a44] hover:bg-[#f0e6da] sm:w-auto"
            >
              Sign in
            </Button>
          </Link>
        </div>
      </div>

      {/* What you get */}
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-3xl tracking-tight">
          What you get
        </h2>
        <p className="mt-4 text-center text-[#4a5a73]">
          Tools that turn job-hunt stress into a clear, measurable plan.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Readiness Scoreboard"
            description="Resume score + interview performance combine into one Hire Readiness Score (0–100) with a breakdown per area and your top-3 action items."
            dot="#d9a441"
          />
          <FeatureCard
            title="Roadmap Generator"
            description="Weaknesses become a 12-week study plan with weekly goals, tailored to your resume and interview gaps."
            dot="#e07a2e"
          />
          <FeatureCard
            title="Mentor Bot"
            description="A context-aware chatbot that knows your resume, scores, and roadmap — ask it anything about your prep."
            dot="#8b6d4a"
          />
          <FeatureCard
            title="Shareable Progress Card"
            description="A progress card that shows your journey — e.g. 'Readiness 74→91' — shareable with mentors or on your network."
            dot="#b7c5ce"
          />
        </div>
      </div>

      {/* How the score works */}
      <div className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="text-center font-display text-3xl tracking-tight">
          How your readiness score works
        </h2>
        <p className="mt-4 text-center text-[#4a5a73]">
          Your Hire Readiness Score is a weighted blend of five areas — 100 points total.
        </p>

        <div className="mt-10 space-y-4">
          <ScoreBar label="Resume" points={30} />
          <ScoreBar label="Mock interview" points={30} />
          <ScoreBar label="Coding test" points={20} />
          <ScoreBar label="Roadmap" points={15} />
          <ScoreBar label="Target companies" points={5} />
        </div>

        <p className="mt-6 text-center text-sm text-[#4a5a73]">
          Each area contributes points based on completeness — a half-finished profile
          never looks "bad."
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  dot,
}: {
  title: string;
  description: string;
  dot: string;
}) {
  return (
    <div className="rounded-xl border border-[#d9a441]/15 bg-white p-6 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d9a441]/10">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dot }} />
      </div>
      <h3 className="mt-4 font-display text-xl tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-[#4a5a73]">{description}</p>
    </div>
  );
}

function ScoreBar({ label, points }: { label: string; points: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-[#4a5a73]">{points} pts</span>
      </div>
      <div className="mt-2 h-3 w-full rounded-full bg-[#e8e0d4]">
        <div
          className="h-3 rounded-full transition-all"
          style={{ width: `${points}%`, backgroundColor: "#d9a441" }}
        />
      </div>
    </div>
  );
}
