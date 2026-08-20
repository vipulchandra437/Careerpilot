import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Contact us</h1>
        <p className="mt-3 text-muted-foreground">
          Questions, feedback, or partnership ideas — we&apos;d love to hear from you.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="font-medium">Email</h2>
            <a href="mailto:support@careerpilot.dev" className="text-sm text-primary underline-offset-2 hover:underline">support@careerpilot.dev</a>
          </div>
          <div>
            <h2 className="font-medium">GitHub</h2>
            <a href="https://github.com/vipulchandra437/Careerpilot" target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline-offset-2 hover:underline">github.com/careerpilot</a>
          </div>
          <div>
            <h2 className="font-medium">Report an issue</h2>
            <p className="text-sm text-muted-foreground">
              If something isn&apos;t working, please include the page and what you expected.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
