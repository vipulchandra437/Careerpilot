import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { updateStudentSkills, getOrCreateProfile } from "@/server/services/profile.service";

const profileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  location: z.string().max(200).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  experienceLevel: z.enum(["ENTRY", "INTERMEDIATE", "EXPERIENCED"]).optional().nullable(),
  studyHoursPerWeek: z.number().int().min(0).max(80).optional().nullable(),
  githubUrl: z.string().url().or(z.literal("")).optional().nullable(),
  linkedinUrl: z.string().url().or(z.literal("")).optional().nullable(),
  portfolioUrl: z.string().url().or(z.literal("")).optional().nullable(),
  education: z
    .object({
      college: z.string().max(200).optional().nullable(),
      degree: z.string().max(200).optional().nullable(),
      branch: z.string().max(200).optional().nullable(),
      graduationYear: z.number().int().min(1950).max(2100).optional().nullable(),
      cgpa: z.number().min(0).max(10).optional().nullable(),
    })
    .optional(),
  skills: z
    .array(z.object({ skillId: z.string(), rating: z.number().int().min(0).max(5) }))
    .max(200)
    .optional(),
  completeOnboarding: z.boolean().optional(),
});

export async function GET() {
  const user = await requireUser();
  const profile = await getOrCreateProfile(user.id);

  const [education, studentSkills] = await Promise.all([
    prisma.education.findUnique({ where: { profileId: profile.id } }),
    prisma.studentSkill.findMany({
      where: { profileId: profile.id },
      select: { skillId: true, rating: true, skill: { select: { name: true, category: true } } },
    }),
  ]);

  return NextResponse.json({
    user: { name: user.name, email: user.email, image: user.image },
    profile: {
      location: profile.location,
      bio: profile.bio,
      experienceLevel: profile.experienceLevel,
      studyHoursPerWeek: profile.studyHoursPerWeek,
      githubUrl: profile.githubUrl,
      linkedinUrl: profile.linkedinUrl,
      portfolioUrl: profile.portfolioUrl,
      targetCompanyId: profile.targetCompanyId,
      targetJobRoleId: profile.targetJobRoleId,
      onboardingCompletedAt: profile.onboardingCompletedAt,
    },
    education,
    skills: studentSkills,
  });
}

export async function PUT(request: Request) {
  const user = await requireUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const profile = await getOrCreateProfile(user.id);

  const emptyToNull = (v: string | null | undefined) => (v ? v : null);

  await prisma.studentProfile.update({
    where: { id: profile.id },
    data: {
      location: emptyToNull(data.location),
      bio: emptyToNull(data.bio),
      experienceLevel: data.experienceLevel,
      studyHoursPerWeek: data.studyHoursPerWeek,
      githubUrl: emptyToNull(data.githubUrl),
      linkedinUrl: emptyToNull(data.linkedinUrl),
      portfolioUrl: emptyToNull(data.portfolioUrl),
    },
  });

  if (data.name && data.name !== user.name) {
    await prisma.user.update({ where: { id: user.id }, data: { name: data.name } });
  }

  if (data.education) {
    const ed = data.education;
    const hasEducation = Boolean(ed.college || ed.degree || ed.branch || ed.graduationYear || ed.cgpa);
    if (hasEducation) {
      await prisma.education.upsert({
        where: { profileId: profile.id },
        update: {
          college: emptyToNull(ed.college) ?? "",
          degree: emptyToNull(ed.degree) ?? "",
          branch: emptyToNull(ed.branch),
          graduationYear: ed.graduationYear,
          cgpa: ed.cgpa,
        },
        create: {
          profileId: profile.id,
          college: ed.college ?? "",
          degree: ed.degree ?? "",
          branch: ed.branch ?? undefined,
          graduationYear: ed.graduationYear ?? undefined,
          cgpa: ed.cgpa ?? undefined,
        },
      });
    } else {
      await prisma.education.deleteMany({ where: { profileId: profile.id } });
    }
  }

  if (data.skills) {
    await updateStudentSkills(
      profile.id,
      data.skills.filter((s) => s.rating > 0),
    );
  }

  if (data.completeOnboarding && !profile.onboardingCompletedAt) {
    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: { onboardingCompletedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
