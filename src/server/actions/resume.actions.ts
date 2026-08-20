"use server";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ResumeContent = {
  personal: {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedin: string;
    summary: string;
  };
  experience: {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string[];
  }[];
  education: {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
    link: string;
  }[];
  skills: string[];
  certifications: {
    title: string;
    company: string;
    startDate: string;
    endDate: string;
  }[];
  languages: string[];
};

const defaultContent: ResumeContent = {
  personal: {
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    summary: "",
  },
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  languages: [],
};

export async function getResumesWithAnalyses() {
  const user = await requireUser();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      resumes: {
        orderBy: { updatedAt: "desc" },
        include: {
          analyses: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              overallScore: true,
              atsScore: true,
              keywordScore: true,
              createdAt: true,
            },
          },
        },
      },
      education: true,
      studentSkills: {
        include: { skill: true },
      },
    },
  });

  if (!profile) throw new Error("Profile not found");

  const userProjects = await prisma.project.findMany({
    where: { userId: user.id },
    select: { name: true, description: true, techStack: true, repoUrl: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    resumes: profile.resumes.map((r) => ({
      ...r,
      content: r.content as unknown as ResumeContent,
      analyses: r.analyses,
    })),
    profileData: {
      name: user.name ?? "",
      email: user.email ?? "",
      location: profile.location ?? "",
      bio: profile.bio ?? "",
      linkedin: profile.linkedinUrl ?? "",
      portfolio: profile.portfolioUrl ?? "",
      education: profile.education
        ? {
            school: profile.education.college,
            degree: profile.education.degree,
            branch: profile.education.branch ?? "",
            graduationYear: profile.education.graduationYear?.toString() ?? "",
          }
        : null,
      skills: profile.studentSkills.map((s) => s.skill.name),
      projects: userProjects.map((p) => ({
        name: p.name,
        description: p.description ?? "",
        technologies: (p.techStack as string[]) ?? [],
        link: p.repoUrl ?? "",
      })),
    },
  };
}

export async function createResume(title?: string) {
  const user = await requireUser();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Profile not found");

  const count = await prisma.resume.count({
    where: { profileId: profile.id },
  });

  const resume = await prisma.resume.create({
    data: {
      profileId: profile.id,
      title: title ?? `Resume ${count + 1}`,
      templateId: "modern",
      content: defaultContent as object,
      isPrimary: count === 0,
    },
  });

  revalidatePath("/resume");
  return resume;
}

export async function updateResume(
  resumeId: string,
  data: {
    title?: string;
    templateId?: string;
    content?: ResumeContent;
  }
) {
  const user = await requireUser();

  const existing = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: { profile: true },
  });
  if (!existing || existing.profile.userId !== user.id) {
    throw new Error("Resume not found or unauthorized");
  }

  const updated = await prisma.resume.update({
    where: { id: resumeId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.templateId !== undefined && { templateId: data.templateId }),
      ...(data.content !== undefined && { content: data.content as object }),
    },
  });

  revalidatePath("/resume");
  return updated;
}

export async function deleteResume(resumeId: string) {
  const user = await requireUser();

  const existing = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: { profile: true },
  });
  if (!existing || existing.profile.userId !== user.id) {
    throw new Error("Resume not found or unauthorized");
  }

  const count = await prisma.resume.count({
    where: { profileId: existing.profileId },
  });
  if (count <= 1) {
    throw new Error("Cannot delete the last resume");
  }

  const wasPrimary = existing.isPrimary;

  await prisma.resume.delete({ where: { id: resumeId } });

  if (wasPrimary) {
    const next = await prisma.resume.findFirst({
      where: { profileId: existing.profileId },
      orderBy: { updatedAt: "desc" },
    });
    if (next) {
      await prisma.resume.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  revalidatePath("/resume");
}

export async function setPrimaryResume(resumeId: string) {
  const user = await requireUser();

  const existing = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: { profile: true },
  });
  if (!existing || existing.profile.userId !== user.id) {
    throw new Error("Resume not found or unauthorized");
  }

  await prisma.resume.updateMany({
    where: { profileId: existing.profileId },
    data: { isPrimary: false },
  });

  await prisma.resume.update({
    where: { id: resumeId },
    data: { isPrimary: true },
  });

  revalidatePath("/resume");
}

export async function runAtsAnalysis(resumeId: string) {
  const user = await requireUser();

  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: { profile: true },
  });
  if (!resume || resume.profile.userId !== user.id) {
    throw new Error("Resume not found or unauthorized");
  }

  const content = resume.content as unknown as ResumeContent;
  const text = serializeContent(content);

  const overallScore = Math.min(100, Math.max(20, Math.round(
    40 + (text.length / 5000) * 20 + (content.skills.length / 10) * 15 + (content.experience.length / 3) * 25
  )));
  const atsScore = Math.min(100, Math.max(15, Math.round(
    content.personal.name && content.personal.email && content.personal.phone ? 60 : 30
    + (content.personal.summary.length > 100 ? 20 : 10)
    + (content.skills.length >= 5 ? 15 : content.skills.length * 3)
    + (content.experience.length > 0 ? 15 : 0)
  )));
  const keywordScore = Math.min(100, Math.max(10, Math.round(
    (content.skills.length / 8) * 40
    + (content.projects.length / 3) * 30
    + (content.experience.length / 3) * 30
  )));
  const contentScore = Math.min(100, Math.max(10, Math.round(
    (content.personal.summary.length / 200) * 30
    + (content.experience.reduce((a, e) => a + e.description.length, 0) / 10) * 40
    + (content.education.length > 0 ? 15 : 0)
    + (content.projects.length > 0 ? 15 : 0)
  )));

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (content.personal.summary.length > 100) strengths.push("Strong professional summary");
  else if (content.personal.summary.length === 0) weaknesses.push("Missing professional summary");

  if (content.skills.length >= 8) strengths.push("Good number of skills listed");
  else weaknesses.push("Consider adding more relevant skills (aim for 8-12)");

  if (content.experience.length > 0) strengths.push("Work experience included");
  else weaknesses.push("No work experience listed");

  if (content.projects.length > 0) strengths.push("Projects section populated");
  else weaknesses.push("Add projects to showcase your work");

  if (content.experience.some((e) => e.description.length >= 3)) strengths.push("Detailed job descriptions with multiple bullet points");

  const missingSkills = content.skills.length < 5
    ? ["Add more industry-relevant skills", "Include both technical and soft skills"]
    : [];

  const recommendations: string[] = [];
  if (content.personal.summary.length < 100) recommendations.push("Write a compelling 2-4 sentence professional summary");
  if (content.experience.length > 0 && content.experience.some((e) => e.description.length < 2))
    recommendations.push("Add 3-5 bullet points per role with quantified achievements");
  if (!content.education.length) recommendations.push("Add your education background");
  if (content.skills.length < 8) recommendations.push("Aim for 8-12 relevant skills");
  if (content.projects.length < 2) recommendations.push("Include 2-3 key projects");

  const analysis = await prisma.resumeAnalysis.create({
    data: {
      resumeId,
      overallScore,
      atsScore,
      contentScore,
      keywordScore,
      strengths,
      weaknesses,
      missingSkills,
      recommendations,
    },
  });

  return analysis;
}

function serializeContent(content: ResumeContent): string {
  const parts: string[] = [];
  parts.push(content.personal.name);
  parts.push(content.personal.title);
  parts.push(content.personal.summary);
  content.experience.forEach((e) => {
    parts.push(e.title, e.company);
    e.description.forEach((d) => parts.push(d));
  });
  content.education.forEach((e) => parts.push(e.title, e.company));
  content.projects.forEach((p) => {
    parts.push(p.name, p.description);
    p.technologies.forEach((t) => parts.push(t));
  });
  parts.push(...content.skills);
  content.certifications.forEach((c) => parts.push(c.title, c.company));
  parts.push(...content.languages);
  return parts.join(" ");
}
