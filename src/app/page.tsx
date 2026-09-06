// WHY placeholder: the real landing copy + auth CTAs are Block 2 scope. This
// proves the design system renders (warm paper bg, ink text, restrained amber)
// so Block 2 starts from a verified visual baseline.

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
        HireReady
      </h1>
      <p className="max-w-md text-center text-base leading-relaxed text-muted-foreground">
        From resume to mock interview to a Hire Readiness Score — built for CS
        students who want answers before the real interview.
      </p>
      <p className="text-sm text-amber-600">
        Foundation done — landing, login &amp; register arrive in Block 2.
      </p>
    </main>
  );
}
