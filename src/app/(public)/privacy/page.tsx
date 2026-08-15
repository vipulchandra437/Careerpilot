export const metadata = { title: "Privacy Policy" };

const sections = [
  {
    title: "What we collect",
    body: "Account details (name, email, hashed password) plus anything you provide for analysis: resume text or files, LinkedIn profile text, GitHub username and repository data, project descriptions, interview answers, transcripts, and self-assessed skills. Career targets (company and role) are stored so we can score your readiness.",
  },
  {
    title: "How we use it",
    body: "To power the analysis features you request (resume, LinkedIn, GitHub, project, communication scoring), to generate roadmaps and reports, to track your coding and interview progress, and to keep the product secure. We do not sell your personal data.",
  },
  {
    title: "AI processing",
    body: "Content you submit for analysis is sent to a third-party AI provider (OpenRouter) solely to generate the analysis you requested. Code you run in the coding workspace is executed in a sandbox for your session and retained as your submission history.",
  },
  {
    title: "Storage and security",
    body: "Passwords are stored only as bcrypt hashes. Data is transmitted over TLS and stored in a database that is not publicly exposed. We apply rate limiting, security headers, and role-based access controls.",
  },
  {
    title: "Your rights (GDPR/CCPA)",
    body: "You can request a machine-readable export of all data we hold about you, and you can permanently delete your account and all associated data. Both actions are available from your account settings. Contact us via the contact page for any request.",
  },
  {
    title: "Retention",
    body: "We retain your data while your account is active. Deleting your account removes your data from the active database; aggregated, de-identified metrics may be retained for product improvement.",
  },
  {
    title: "Changes",
    body: "We may update this policy. Material changes will be announced on this page with an updated revision date.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
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
