import { CareerTargetWizard } from "@/components/career-target/career-target-wizard";

export default function CareerTargetPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-10 text-slate-800 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold text-indigo-600">Career target</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Let&apos;s find your direction</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Three short steps. Pick the role you want, the kind of company you like, and a few names to watch.
          </p>
        </header>
        {/* Prefill runs in the wizard: the FastAPI JWT is in localStorage, so a server page cannot read it. */}
        <CareerTargetWizard />
      </div>
    </main>
  );
}
