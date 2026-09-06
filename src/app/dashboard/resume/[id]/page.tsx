import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResumeDetailPage({ params }: { params: { id: string } }) {
  // WHY placeholder: Block 4 builds the full detail view (parsed JSON, analysis,
  // interview prep). This page exists only so the dashboard's resume links
  // resolve to a real route — nothing else.
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <a
            href="/dashboard"
            className="font-serif text-xl font-semibold tracking-tight text-foreground"
          >
            HireReady
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Resume #{params.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is under construction. The detailed resume view — including
              parsed text, analysis, and interview preparation — will land in a
              future block.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
