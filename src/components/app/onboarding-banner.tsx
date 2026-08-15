import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function OnboardingBanner() {
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <AlertTriangle className="size-4" />
      <AlertTitle>Complete your profile to unlock personalized insights</AlertTitle>
      <AlertDescription>
        Set your career goal, skills, and links so CareerPilot can measure your
        readiness.{" "}
        <Link href="/career-goal" className="font-medium underline underline-offset-2">
          Get started
        </Link>
      </AlertDescription>
    </Alert>
  );
}
