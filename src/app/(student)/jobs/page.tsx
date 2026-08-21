import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { JobTracker } from "@/components/jobs/job-tracker";

export const metadata = { title: "Job Tracker" };

export default async function JobsPage() {
  const user = await requireUser();

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Job Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and manage your job applications in one place.
        </p>
      </div>
      <JobTracker
        initialJobs={jobs.map((j) => ({
          id: j.id,
          title: j.title,
          company: j.company,
          location: j.location,
          url: j.url,
          description: j.description,
          salary: j.salary,
          status: j.status,
          notes: j.notes,
          appliedAt: j.appliedAt?.toISOString() ?? null,
          followUpDate: j.followUpDate?.toISOString() ?? null,
          createdAt: j.createdAt.toISOString(),
          updatedAt: j.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
