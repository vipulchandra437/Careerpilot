import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

export const metadata = { title: "Pricing" };

const plans = [
  {
    name: "Student",
    price: "$0",
    period: "/forever",
    description: "Everything you need to get started.",
    features: [
      "Full career profile & onboarding",
      "Company readiness scores",
      "Coding assessment (core problems)",
      "Resume analyzer (3 analyses)",
      "Skill gap analysis & roadmap",
      "Career readiness report",
    ],
    cta: "Start free",
    href: "/register",
    featured: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "For serious placement preparation.",
    features: [
      "Everything in Student",
      "Unlimited AI resume analysis",
      "Unlimited mock interviews",
      "Communication analysis",
      "GitHub, LinkedIn & project analyzers",
      "AI career mentor",
      "Hiring pipeline simulation",
      "PDF career report download",
    ],
    cta: "Go Pro",
    href: "/register",
    featured: true,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Start free and upgrade when you&apos;re ready to go all-in on placement preparation.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.name} className={p.featured ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="text-xl">{p.name}</CardTitle>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={p.featured ? "default" : "outline"} render={<Link href={p.href} />}>
                {p.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Pricing is a placeholder for this project build. Payment processing is not yet wired up.
      </p>
    </div>
  );
}
