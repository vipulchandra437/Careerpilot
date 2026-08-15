import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { CommunicationAnalyzer } from "@/components/communication/communication-analyzer";

export const metadata = { title: "Communication" };

export default async function CommunicationPage() {
  const user = await requireUser();

  const analyses = await prisma.communicationAnalysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      score: true,
      transcript: true,
      createdAt: true,
    },
    take: 5,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communication Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record or paste a spoken answer to get fluency, clarity, grammar, and
          vocabulary feedback that improves how you sound in interviews.
        </p>
      </div>
      <CommunicationAnalyzer
        analyses={analyses.map((a) => ({
          id: a.id,
          score: a.score,
          createdAt: a.createdAt.toISOString(),
          preview: a.transcript.slice(0, 120),
        }))}
      />
    </div>
  );
}
