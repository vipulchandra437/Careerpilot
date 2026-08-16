import { prisma } from "@/lib/db";

export async function getOrCreateProfile(userId: string) {
  return prisma.studentProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export function proficiencyFromRating(rating: number): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" {
  if (rating >= 5) return "EXPERT";
  if (rating >= 4) return "ADVANCED";
  if (rating >= 3) return "INTERMEDIATE";
  return "BEGINNER";
}

export async function updateStudentSkills(
  profileId: string,
  skills: { skillId: string; rating: number }[],
) {
  const valid = skills.filter((s) => s.skillId && s.rating >= 1 && s.rating <= 5);
  const validIds = valid.map((s) => s.skillId);

  // Remove skills no longer present.
  await prisma.studentSkill.deleteMany({
    where: { profileId, skillId: { notIn: validIds } },
  });

  for (const s of valid) {
    await prisma.studentSkill.upsert({
      where: { profileId_skillId: { profileId, skillId: s.skillId } },
      update: { rating: s.rating, proficiency: proficiencyFromRating(s.rating) },
      create: {
        profileId,
        skillId: s.skillId,
        rating: s.rating,
        proficiency: proficiencyFromRating(s.rating),
      },
    });
  }
}
