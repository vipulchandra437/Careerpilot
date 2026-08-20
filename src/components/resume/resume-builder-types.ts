import type { ResumeContent } from "@/server/actions/resume.actions";

export type ResumeVersion = {
  id: string;
  title: string;
  templateId: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  content: ResumeContent;
  analyses: {
    id: string;
    overallScore: number;
    atsScore: number;
    keywordScore: number;
    createdAt: string;
  }[];
};

export type ProfileData = {
  name: string;
  email: string;
  location: string;
  bio: string;
  linkedin: string;
  portfolio: string;
  education: {
    school: string;
    degree: string;
    branch: string;
    graduationYear: string;
  } | null;
  skills: string[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
    link: string;
  }[];
};

export function emptyContent(profile?: ProfileData): ResumeContent {
  return {
    personal: {
      name: profile?.name ?? "",
      title: "",
      email: profile?.email ?? "",
      phone: "",
      location: profile?.location ?? "",
      website: profile?.portfolio ?? "",
      linkedin: profile?.linkedin ?? "",
      summary: profile?.bio ?? "",
    },
    experience: [],
    education: profile?.education
      ? [
          {
            title:
              profile.education.degree +
              (profile.education.branch ? ` in ${profile.education.branch}` : ""),
            company: profile.education.school,
            location: "",
            startDate: profile.education.graduationYear
              ? `Grad ${profile.education.graduationYear}`
              : "",
            endDate: "",
          },
        ]
      : [],
    projects: (profile?.projects ?? []).map((p) => ({
      name: p.name,
      description: p.description,
      technologies: p.technologies,
      link: p.link,
    })),
    skills: profile?.skills ?? [],
    certifications: [],
    languages: [],
  };
}

export type Props = {
  initialResumes: ResumeVersion[];
  profileData: ProfileData;
  pastAnalyses: {
    id: string;
    overallScore: number;
    atsScore: number;
    keywordScore: number;
    createdAt: string;
    strengths: string[];
  }[];
};
