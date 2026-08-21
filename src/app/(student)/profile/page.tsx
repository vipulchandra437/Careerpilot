import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileCompleteness } from "@/components/profile/profile-completeness";
import { ExperienceSection } from "@/components/profile/experience-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

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
        workExperience: { orderBy: { startDate: "desc" } },
        studentSkills: { select: { skillId: true, rating: true } },
      },
    }),
  ]);

  const careerGoal = await prisma.careerGoal.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

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

  const skillCount = profile?.studentSkills.length ?? 0;
  const hasEducation = Boolean(profile?.education);

  const completenessData = {
    name: user.name,
    email: user.email,
    bio: profile?.bio ?? null,
    location: profile?.location ?? null,
    experienceLevel: profile?.experienceLevel ?? null,
    skills: skillCount,
    education: hasEducation,
    githubUrl: profile?.githubUrl ?? null,
    linkedinUrl: profile?.linkedinUrl ?? null,
    portfolioUrl: profile?.portfolioUrl ?? null,
    hasCareerGoal: Boolean(careerGoal),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile powers every assessment, score, and recommendation on CareerPilot.
        </p>
      </div>

      <ProfileCompleteness data={completenessData} />

      <ProfileForm
        user={{ name: user.name, email: user.email, image: user.image }}
        profile={profile}
        groupedSkills={grouped}
        currentRatings={Object.fromEntries(currentRatings)}
      />

      <ExperienceSection
        experiences={profile?.workExperience.map((e) => ({
          id: e.id,
          title: e.title,
          company: e.company,
          location: e.location,
          startDate: e.startDate,
          endDate: e.endDate,
          current: e.current,
          description: e.description,
        })) ?? []}
      />

      {(profile?.githubUrl || profile?.linkedinUrl || profile?.portfolioUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {profile?.githubUrl && (
                <Link
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <ExternalLink className="size-4" />
                  GitHub
                </Link>
              )}
              {profile?.linkedinUrl && (
                <Link
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <ExternalLink className="size-4" />
                  LinkedIn
                </Link>
              )}
              {profile?.portfolioUrl && (
                <Link
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <ExternalLink className="size-4" />
                  Portfolio
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
