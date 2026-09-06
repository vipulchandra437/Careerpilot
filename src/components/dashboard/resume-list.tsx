import { ResumeListItem, type Resume } from "@/components/dashboard/resume-list-item";

interface ResumeListProps {
  resumes: Resume[];
}

// WHY server component composing client components: the list structure itself
// needs no React state, so it renders on the server. Each ResumeListItem is a
// client component (has its own useState), so interactivity still works.
// router.refresh() in a child re-runs this server component, re-fetching via
// the parent DashboardPage.
export function ResumeList({ resumes }: ResumeListProps) {
  if (resumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-16 text-center">
        <DocumentIcon className="h-16 w-16 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">
          No resumes yet — upload your first one to get started
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {resumes.map((resume) => (
        <ResumeListItem key={resume.id} resume={resume} />
      ))}
    </ul>
  );
}

// WHY inline SVG: the empty state illustration is a stylized document with a
// plus — no external assets needed (DESIGN.md: placeholder-level, honest aesthetic).
function DocumentIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2-8V6a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2zM9 5V3a3 0 015.196-2.236l3.042 3.042A3 0 0115 5v1M9 5h6"
      />
    </svg>
  );
}
