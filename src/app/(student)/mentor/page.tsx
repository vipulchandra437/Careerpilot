import { requireUser } from "@/lib/auth-helpers";
import { MentorChat } from "@/components/mentor/mentor-chat";

export const metadata = { title: "Career Mentor" };

export default async function MentorPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Career Mentor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask for career advice and get answers grounded in your real profile data.
        </p>
      </div>
      <MentorChat name={user.name} />
    </div>
  );
}
