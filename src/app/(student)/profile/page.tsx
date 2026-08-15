import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [skills, profile] = await Promise.all([
    prisma.skill.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true },
    }),
    prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        education: true,
        studentSkills: { select: { skillId: true, rating: true } },
      },
    }),
  ]);

  const categoryOrder = [
    "PROGRAMMING_LANGUAGE",
    "FRAMEWORK",
    "DATABASE",
    "AI_ML",
    "CLOUD",
    "DEVOPS",
    "TOOL",
    "SOFT_SKILL",
    "OTHER",
  ] as const;
  const categoryLabels: Record<string, string> = {
    PROGRAMMING_LANGUAGE: "Programming Languages",
    FRAMEWORK: "Frameworks",
    DATABASE: "Databases",
    AI_ML: "AI / ML",
    CLOUD: "Cloud",
    DEVOPS: "DevOps",
    TOOL: "Core CS & Tools",
    SOFT_SKILL: "Soft Skills",
    OTHER: "Other",
  };

  const grouped = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      skills: skills.filter((s) => s.category === cat),
    }))
    .filter((g) => g.skills.length > 0);

  const currentRatings = new Map(profile?.studentSkills.map((s) => [s.skillId, s.rating]) ?? []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile powers every assessment, score, and recommendation on CareerPilot.
        </p>
      </div>
      <ProfileForm
        user={{ name: user.name, email: user.email, image: user.image }}
        profile={profile}
        groupedSkills={grouped}
        currentRatings={Object.fromEntries(currentRatings)}
      />
    </div>
  );
}
