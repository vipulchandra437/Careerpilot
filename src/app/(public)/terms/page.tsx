export const metadata = { title: "Terms of Service" };

const sections = [
  {
    title: "Use of the service",
    body: "CareerPilot provides AI-assisted career preparation tools. You may use the service only in compliance with these terms and applicable law. Accounts are for the named individual; sharing credentials is not permitted.",
  },
  {
    title: "AI output",
    body: "Analysis results, feedback, and generated content are provided for guidance only and may contain errors. You are responsible for verifying information before relying on it, including in job applications.",
  },
  {
    title: "Your content",
    body: "You retain ownership of the resumes, profiles, code, and other content you submit. You grant us a limited license to process and store it solely to operate the service and provide the features you use.",
  },
  {
    title: "Acceptable use",
    body: "You may not attempt to disrupt the service, probe or exploit its security, use the code-execution features to run malicious code or attack other systems, or submit content that is unlawful or infringing.",
  },
  {
    title: "Code execution sandbox",
    body: "Code you run in the coding workspace executes in an isolated sandbox with resource limits. You are responsible for the code you submit and agree not to attempt to escape the sandbox.",
  },
  {
    title: "Termination",
    body: "We may suspend or terminate accounts that violate these terms. You may delete your account at any time, which removes your data in accordance with our privacy policy.",
  },
  {
    title: "Limitation of liability",
    body: "The service is provided as-is without warranties. To the maximum extent permitted by law, we are not liable for indirect or consequential damages arising from use of the service.",
  },
  {
    title: "Contact",
    body: "Questions about these terms can be directed through the contact page.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: August 2026</p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <p className="mt-2 text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
