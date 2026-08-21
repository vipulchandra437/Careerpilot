"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createResume,
  updateResume,
  deleteResume,
  setPrimaryResume,
  runAtsAnalysis,
  type ResumeContent,
} from "@/server/actions/resume.actions";
import { resumeToText, deterministicAnalyzeResume } from "@/server/services/resume-content";
import { ResumePreview } from "@/components/resume/resume-preview";
import {
  TemplateSelector,
  type TemplateId,
} from "@/components/resume/template-selector";
import { ResumeAnalyzer } from "@/components/resume/resume-analyzer";
import { CoverLetterBuilder } from "@/components/resume/cover-letter-builder";
import { ResumeTailor } from "@/components/resume/resume-tailor";
import { VersionDiff } from "@/components/resume/version-diff";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Save,
  Star,
  Palette,
  Sparkles,
  Loader2,
  Eye,
  ChevronUp,
  ChevronDown,
  Mail,
  Wand2,
  GitCompare,
  Gauge,
} from "lucide-react";
import {
  type ResumeVersion,
  type Props,
  emptyContent,
} from "@/components/resume/resume-builder-types";

function formatDateRange(start: string, end: string) {
  if (!start && !end) return "";
  if (start && end) return start + " - " + end;
  if (start) return start + " - Present";
  return end;
}

export function ResumeBuilder({ initialResumes, profileData, pastAnalyses }: Props) {
  const [resumes, setResumes] = useState<ResumeVersion[]>(initialResumes);
  const [activeId, setActiveId] = useState<string | null>(
    initialResumes.find((r) => r.isPrimary)?.id ?? initialResumes[0]?.id ?? null
  );
  const [content, setContent] = useState<ResumeContent>(
    initialResumes.find((r) => r.isPrimary)?.content ?? initialResumes[0]?.content ?? emptyContent(profileData)
  );
  const [templateId, setTemplateId] = useState<TemplateId>(
    (initialResumes.find((r) => r.isPrimary)?.templateId ?? initialResumes[0]?.templateId ?? "modern") as TemplateId
  );
  const [title, setTitle] = useState(
    initialResumes.find((r) => r.isPrimary)?.title ?? initialResumes[0]?.title ?? "My Resume"
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newResumeTitle, setNewResumeTitle] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const [pageTab, setPageTab] = useState("builder");

  const activeResume = resumes.find((r) => r.id === activeId);

  const markDirty = useCallback(() => setDirty(true), []);

  const switchTo = useCallback(
    (id: string) => {
      if (id === activeId) return;
      if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
      const target = resumes.find((r) => r.id === id);
      if (!target) return;
      setActiveId(id);
      setContent(target.content);
      setTemplateId(target.templateId as TemplateId);
      setTitle(target.title);
      setDirty(false);
    },
    [activeId, dirty, resumes]
  );

  const handleSave = useCallback(async () => {
    if (!activeId) return;
    setSaving(true);
    try {
      await updateResume(activeId, { title, templateId, content });
      setResumes((prev) =>
        prev.map((r) =>
          r.id === activeId ? { ...r, title, templateId, content, updatedAt: new Date().toISOString() } : r
        )
      );
      setDirty(false);
      toast.success("Resume saved");
    } catch {
      toast.error("Failed to save resume");
    } finally {
      setSaving(false);
    }
  }, [activeId, title, templateId, content]);

  const handleCreate = useCallback(async () => {
    try {
      const resume = await createResume(newResumeTitle || undefined);
      const newVersion: ResumeVersion = {
        ...resume,
        content: emptyContent(profileData),
        analyses: [],
        createdAt: resume.createdAt.toISOString(),
        updatedAt: resume.updatedAt.toISOString(),
      };
      setResumes((prev) => [newVersion, ...prev]);
      setActiveId(newVersion.id);
      setContent(newVersion.content);
      setTemplateId(newVersion.templateId as TemplateId);
      setTitle(newVersion.title);
      setDirty(false);
      setShowNewDialog(false);
      setNewResumeTitle("");
      toast.success("Resume created");
    } catch {
      toast.error("Failed to create resume");
    }
  }, [newResumeTitle, profileData]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (resumes.length <= 1) {
        toast.error("Cannot delete the last resume");
        return;
      }
      if (!confirm("Delete this resume version?")) return;
      try {
        await deleteResume(id);
        const remaining = resumes.filter((r) => r.id !== id);
        setResumes(remaining);
        if (activeId === id) {
          const next = remaining[0];
          setActiveId(next.id);
          setContent(next.content);
          setTemplateId(next.templateId as TemplateId);
          setTitle(next.title);
          setDirty(false);
        }
        toast.success("Resume deleted");
      } catch {
        toast.error("Failed to delete resume");
      }
    },
    [resumes, activeId]
  );

  const handleSetPrimary = useCallback(async (id: string) => {
    try {
      await setPrimaryResume(id);
      setResumes((prev) => prev.map((r) => ({ ...r, isPrimary: r.id === id })));
      toast.success("Primary resume updated");
    } catch {
      toast.error("Failed to set primary");
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!activeId) return;
    setAnalyzing(true);
    try {
      const analysis = await runAtsAnalysis(activeId);
      setResumes((prev) =>
        prev.map((r) =>
          r.id === activeId
            ? {
                ...r,
                analyses: [
                  {
                    id: analysis.id,
                    overallScore: analysis.overallScore,
                    atsScore: analysis.atsScore,
                    keywordScore: analysis.keywordScore,
                    createdAt: analysis.createdAt.toISOString(),
                  },
                  ...r.analyses,
                ].slice(0, 5),
              }
            : r
        )
      );
      toast.success("ATS Score: " + analysis.overallScore + "/100");
    } catch {
      toast.error("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [activeId]);

  const handleExportPdf = useCallback(async () => {
    if (!previewRef.current) return;
    setExportingPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [595, 842] });
      pdf.addImage(imgData, "PNG", 0, 0, 595, 842);
      pdf.save((title.replace(/[^a-zA-Z0-9]/g, "_") || "resume") + ".pdf");
      toast.success("PDF exported");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  }, [title]);

  const handleExportDocx = useCallback(async () => {
    setExportingDocx(true);
    try {
      const docx = await import("docx");
      const { saveAs } = await import("file-saver");
      const { Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip } = docx;
      const pers = content.personal;
      const paragraphs: InstanceType<typeof Paragraph>[] = [];

      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: pers.name || "Your Name", bold: true, size: 28, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
        })
      );

      if (pers.title) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: pers.title, size: 22, color: "666666", font: "Calibri", italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          })
        );
      }

      const contactParts: string[] = [];
      if (pers.email) contactParts.push(pers.email);
      if (pers.phone) contactParts.push(pers.phone);
      if (pers.location) contactParts.push(pers.location);
      if (pers.website) contactParts.push(pers.website);
      if (pers.linkedin) contactParts.push(pers.linkedin);
      if (contactParts.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: contactParts.join(" | "), size: 18, color: "666666", font: "Calibri" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );
      }

      function docSectionHeading(text: string) {
        return new Paragraph({
          children: [new TextRun({ text, bold: true, size: 22, font: "Calibri", color: "1a1a2e" })],
          spacing: { before: 200, after: 80 },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          border: { bottom: { style: "single" as any, size: 4, color: "cccccc" } },
        });
      }

      if (pers.summary) {
        paragraphs.push(docSectionHeading("Professional Summary"));
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: pers.summary, size: 20, font: "Calibri" })], spacing: { after: 160 } }));
      }

      if (content.experience.length > 0) {
        paragraphs.push(docSectionHeading("Experience"));
        content.experience.forEach((exp) => {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: exp.title, bold: true, size: 20, font: "Calibri" }),
                new TextRun({ text: "    " + formatDateRange(exp.startDate, exp.endDate), size: 18, color: "888888", font: "Calibri" }),
              ],
              spacing: { after: 40 },
            })
          );
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: exp.company + (exp.location ? " - " + exp.location : ""), size: 18, color: "555555", font: "Calibri", italics: true })],
              spacing: { after: 60 },
            })
          );
          exp.description.forEach((desc) => {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: "\u2022 " + desc, size: 19, font: "Calibri" })],
                spacing: { after: 20 },
                indent: { left: convertInchesToTwip(0.3) },
              })
            );
          });
          paragraphs.push(new Paragraph({ spacing: { after: 120 } }));
        });
      }

      if (content.education.length > 0) {
        paragraphs.push(docSectionHeading("Education"));
        content.education.forEach((edu) => {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: edu.title, bold: true, size: 20, font: "Calibri" }),
                new TextRun({ text: "    " + formatDateRange(edu.startDate, edu.endDate), size: 18, color: "888888", font: "Calibri" }),
              ],
              spacing: { after: 40 },
            })
          );
          paragraphs.push(new Paragraph({ children: [new TextRun({ text: edu.company, size: 18, color: "555555", font: "Calibri", italics: true })], spacing: { after: 100 } }));
        });
      }

      if (content.projects.length > 0) {
        paragraphs.push(docSectionHeading("Projects"));
        content.projects.forEach((proj) => {
          const projChildren: InstanceType<typeof TextRun>[] = [new TextRun({ text: proj.name, bold: true, size: 20, font: "Calibri" })];
          if (proj.link) projChildren.push(new TextRun({ text: " - " + proj.link, size: 18, font: "Calibri", color: "2563EB" }));
          paragraphs.push(new Paragraph({ children: projChildren, spacing: { after: 40 } }));
          if (proj.description) paragraphs.push(new Paragraph({ children: [new TextRun({ text: proj.description, size: 19, font: "Calibri" })], spacing: { after: 40 } }));
          if (proj.technologies.length > 0) paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Tech: " + proj.technologies.join(", "), size: 18, color: "666666", font: "Calibri", italics: true })], spacing: { after: 100 } }));
        });
      }

      if (content.skills.length > 0) {
        paragraphs.push(docSectionHeading("Skills"));
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: content.skills.join(" | "), size: 20, font: "Calibri" })], spacing: { after: 160 } }));
      }

      if (content.certifications.length > 0) {
        paragraphs.push(docSectionHeading("Certifications"));
        content.certifications.forEach((cert) => {
          const children: InstanceType<typeof TextRun>[] = [
            new TextRun({ text: cert.title, bold: true, size: 20, font: "Calibri" }),
            new TextRun({ text: " - " + cert.company, size: 19, font: "Calibri" }),
          ];
          if (cert.startDate) children.push(new TextRun({ text: " (" + formatDateRange(cert.startDate, cert.endDate) + ")", size: 18, color: "888888", font: "Calibri" }));
          paragraphs.push(new Paragraph({ children, spacing: { after: 60 } }));
        });
      }

      if (content.languages.length > 0) {
        paragraphs.push(docSectionHeading("Languages"));
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: content.languages.join(", "), size: 20, font: "Calibri" })], spacing: { after: 160 } }));
      }

      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, (title.replace(/[^a-zA-Z0-9]/g, "_") || "resume") + ".docx");
      toast.success("DOCX exported");
    } catch {
      toast.error("Failed to export DOCX");
    } finally {
      setExportingDocx(false);
    }
  }, [content, title]);

  const updatePersonal = useCallback(
    (field: keyof ResumeContent["personal"], value: string) => {
      setContent((prev) => ({ ...prev, personal: { ...prev.personal, [field]: value } }));
      markDirty();
    },
    [markDirty]
  );

  const addExperience = useCallback(() => {
    setContent((prev) => ({ ...prev, experience: [...prev.experience, { title: "", company: "", location: "", startDate: "", endDate: "", description: [""] }] }));
    markDirty();
  }, [markDirty]);

  const updateExperience = useCallback(
    (index: number, field: keyof ResumeContent["experience"][number], value: string) => {
      setContent((prev) => ({ ...prev, experience: prev.experience.map((e, i) => (i === index ? { ...e, [field]: value } : e)) }));
      markDirty();
    },
    [markDirty]
  );

  const removeExperience = useCallback(
    (index: number) => {
      setContent((prev) => ({ ...prev, experience: prev.experience.filter((_, i) => i !== index) }));
      markDirty();
    },
    [markDirty]
  );

  const addExperienceBullet = useCallback(
    (index: number) => {
      setContent((prev) => ({ ...prev, experience: prev.experience.map((e, i) => (i === index ? { ...e, description: [...e.description, ""] } : e)) }));
      markDirty();
    },
    [markDirty]
  );

  const updateExperienceBullet = useCallback(
    (expIndex: number, bulletIndex: number, value: string) => {
      setContent((prev) => ({
        ...prev,
        experience: prev.experience.map((e, i) =>
          i === expIndex ? { ...e, description: e.description.map((d, j) => (j === bulletIndex ? value : d)) } : e
        ),
      }));
      markDirty();
    },
    [markDirty]
  );

  const removeExperienceBullet = useCallback(
    (expIndex: number, bulletIndex: number) => {
      setContent((prev) => ({
        ...prev,
        experience: prev.experience.map((e, i) => (i === expIndex ? { ...e, description: e.description.filter((_, j) => j !== bulletIndex) } : e)),
      }));
      markDirty();
    },
    [markDirty]
  );

  const addEducation = useCallback(() => {
    setContent((prev) => ({ ...prev, education: [...prev.education, { title: "", company: "", location: "", startDate: "", endDate: "" }] }));
    markDirty();
  }, [markDirty]);

  const updateEducation = useCallback(
    (index: number, field: string, value: string) => {
      setContent((prev) => ({ ...prev, education: prev.education.map((e, i) => (i === index ? { ...e, [field]: value } : e)) }));
      markDirty();
    },
    [markDirty]
  );

  const removeEducation = useCallback(
    (index: number) => {
      setContent((prev) => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }));
      markDirty();
    },
    [markDirty]
  );

  const addProject = useCallback(() => {
    setContent((prev) => ({ ...prev, projects: [...prev.projects, { name: "", description: "", technologies: [], link: "" }] }));
    markDirty();
  }, [markDirty]);

  const updateProject = useCallback(
    (index: number, field: keyof ResumeContent["projects"][number], value: string | string[]) => {
      setContent((prev) => ({ ...prev, projects: prev.projects.map((p, i) => (i === index ? { ...p, [field]: value } : p)) }));
      markDirty();
    },
    [markDirty]
  );

  const removeProject = useCallback(
    (index: number) => {
      setContent((prev) => ({ ...prev, projects: prev.projects.filter((_, i) => i !== index) }));
      markDirty();
    },
    [markDirty]
  );

  const addSkill = useCallback(
    (skill: string) => {
      if (!skill.trim()) return;
      setContent((prev) => ({ ...prev, skills: [...prev.skills, skill.trim()] }));
      markDirty();
    },
    [markDirty]
  );

  const removeSkill = useCallback(
    (index: number) => {
      setContent((prev) => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
      markDirty();
    },
    [markDirty]
  );

  const addLanguage = useCallback(
    (lang: string) => {
      if (!lang.trim()) return;
      setContent((prev) => ({ ...prev, languages: [...prev.languages, lang.trim()] }));
      markDirty();
    },
    [markDirty]
  );

  const removeLanguage = useCallback(
    (index: number) => {
      setContent((prev) => ({ ...prev, languages: prev.languages.filter((_, i) => i !== index) }));
      markDirty();
    },
    [markDirty]
  );

  const addCertification = useCallback(() => {
    setContent((prev) => ({ ...prev, certifications: [...prev.certifications, { title: "", company: "", startDate: "", endDate: "" }] }));
    markDirty();
  }, [markDirty]);

  const updateCertification = useCallback(
    (index: number, field: string, value: string) => {
      setContent((prev) => ({ ...prev, certifications: prev.certifications.map((c, i) => (i === index ? { ...c, [field]: value } : c)) }));
      markDirty();
    },
    [markDirty]
  );

  const removeCertification = useCallback(
    (index: number) => {
      setContent((prev) => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== index) }));
      markDirty();
    },
    [markDirty]
  );

  const [skillInput, setSkillInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [techInput, setTechInput] = useState("");
  const [techProjectIndex, setTechProjectIndex] = useState(-1);
  const [expandedExp, setExpandedExp] = useState<Record<number, boolean>>({});
  const [liveAtsScore, setLiveAtsScore] = useState<number | null>(null);
  const [rewritingSection, setRewritingSection] = useState<string | null>(null);
  const atsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (atsTimerRef.current) clearTimeout(atsTimerRef.current);
    atsTimerRef.current = setTimeout(() => {
      const text = resumeToText(content as Parameters<typeof resumeToText>[0], 12000);
      if (text.trim()) {
        const result = deterministicAnalyzeResume(text);
        setLiveAtsScore(result.overallScore);
      } else {
        setLiveAtsScore(null);
      }
    }, 500);
    return () => {
      if (atsTimerRef.current) clearTimeout(atsTimerRef.current);
    };
  }, [content]);

  const handleRewriteSection = useCallback(
    async (section: string, currentText: string, onUpdate: (newText: string) => void) => {
      if (!currentText.trim()) {
        toast.error("Section is empty — add content before rewriting");
        return;
      }
      setRewritingSection(section);
      try {
        const res = await fetch("/api/resume/rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, content: currentText }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error ?? "Rewrite failed");
          return;
        }
        onUpdate(data.rewritten);
        markDirty();
        toast.success(data.aiGenerated ? "Rewritten with AI" : "Content improved");
      } catch {
        toast.error("Rewrite failed");
      } finally {
        setRewritingSection(null);
      }
    },
    [markDirty]
  );

  if (resumes.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 size-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No resumes yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create your first resume to get started.</p>
            <Button onClick={() => setShowNewDialog(true)} className="mt-4">
              <Plus className="size-4" /> Create Resume
            </Button>
          </CardContent>
        </Card>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Resume</DialogTitle>
              <DialogDescription>Give your resume a name.</DialogDescription>
            </DialogHeader>
            <Input value={newResumeTitle} onChange={(e) => setNewResumeTitle(e.target.value)} placeholder="e.g. Software Engineer Resume" autoFocus />
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={pageTab} onValueChange={setPageTab}>
        <div className="flex items-center justify-between">
          <TabsList className="w-auto justify-start">
            <TabsTrigger value="builder">
              <FileText className="mr-1.5 size-3.5" />
              Resume Builder
            </TabsTrigger>
            <TabsTrigger value="cover-letter">
              <Mail className="mr-1.5 size-3.5" />
              Cover Letters
            </TabsTrigger>
            <TabsTrigger value="tailor">
              <Wand2 className="mr-1.5 size-3.5" />
              Tailor
            </TabsTrigger>
            <TabsTrigger value="diff">
              <GitCompare className="mr-1.5 size-3.5" />
              Version Diff
            </TabsTrigger>
            <TabsTrigger value="analyze">
              <Sparkles className="mr-1.5 size-3.5" />
              Upload &amp; Analyze
            </TabsTrigger>
          </TabsList>
          {pageTab === "builder" && liveAtsScore !== null && (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
              <Gauge className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">ATS</span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  liveAtsScore >= 70 ? "text-emerald-600" : liveAtsScore >= 40 ? "text-amber-600" : "text-red-600"
                )}
              >
                {liveAtsScore}/100
              </span>
            </div>
          )}
        </div>

        <TabsContent value="builder">
          <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr_595px]">
            {/* Left sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Versions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {resumes.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors hover:bg-muted",
                        r.id === activeId ? "border-primary bg-primary/5" : "border-border"
                      )}
                      onClick={() => switchTo(r.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium">{r.title}</span>
                          {r.isPrimary && (
                            <Badge variant="default" className="shrink-0 px-1 py-0 text-[10px]">
                              <Star className="mr-0.5 size-2.5" />
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {r.analyses.length > 0 ? "ATS: " + r.analyses[0].overallScore + "/100" : "Not analyzed"}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                        {!r.isPrimary && (
                          <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); handleSetPrimary(r.id); }} title="Set as primary">
                            <Star className="size-3" />
                          </Button>
                        )}
                        {resumes.length > 1 && (
                          <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} title="Delete">
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowNewDialog(true)}>
                    <Plus className="size-3.5" /> New Resume
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm"><Palette className="mr-1.5 inline size-3.5" />Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <TemplateSelector value={templateId} onChange={(id) => { setTemplateId(id); markDirty(); }} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 pt-0">
                  <Button className="w-full" onClick={handleSave} disabled={saving || !dirty}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {saving ? "Saving..." : dirty ? "Save changes" : "Saved"}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleAnalyze} disabled={analyzing}>
                    {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {analyzing ? "Analyzing..." : "Run ATS Analysis"}
                  </Button>
                  <Separator />
                  <Button variant="outline" className="w-full" onClick={handleExportPdf} disabled={exportingPdf}>
                    {exportingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    {exportingPdf ? "Exporting..." : "Export PDF"}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleExportDocx} disabled={exportingDocx}>
                    {exportingDocx ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                    {exportingDocx ? "Exporting..." : "Export DOCX"}
                  </Button>
                </CardContent>
              </Card>

              {activeResume?.analyses && activeResume.analyses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Latest Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Overall</span>
                      <span className="font-medium">{activeResume.analyses[0].overallScore}/100</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">ATS</span>
                      <span className="font-medium">{activeResume.analyses[0].atsScore}/100</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Keywords</span>
                      <span className="font-medium">{activeResume.analyses[0].keywordScore}/100</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Center editor */}
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
              <div className="flex items-center gap-2">
                <Input value={title} onChange={(e) => { setTitle(e.target.value); markDirty(); }} className="text-lg font-semibold h-9" placeholder="Resume title" />
              </div>

              {/* Personal info */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Personal Information</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={rewritingSection === "summary" || !content.personal.summary.trim()}
                    onClick={() =>
                      handleRewriteSection("Professional Summary", content.personal.summary, (v) =>
                        updatePersonal("summary", v)
                      )
                    }
                  >
                    {rewritingSection === "summary" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Wand2 className="size-3" />
                    )}
                    Rewrite Summary
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label className="text-xs">Full Name</Label><Input value={content.personal.name} onChange={(e) => updatePersonal("name", e.target.value)} placeholder="John Doe" /></div>
                    <div className="space-y-1"><Label className="text-xs">Job Title</Label><Input value={content.personal.title} onChange={(e) => updatePersonal("title", e.target.value)} placeholder="Software Engineer" /></div>
                    <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={content.personal.email} onChange={(e) => updatePersonal("email", e.target.value)} placeholder="john@example.com" /></div>
                    <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={content.personal.phone} onChange={(e) => updatePersonal("phone", e.target.value)} placeholder="+1 234 567 890" /></div>
                    <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={content.personal.location} onChange={(e) => updatePersonal("location", e.target.value)} placeholder="San Francisco, CA" /></div>
                    <div className="space-y-1"><Label className="text-xs">Website</Label><Input value={content.personal.website} onChange={(e) => updatePersonal("website", e.target.value)} placeholder="https://..." /></div>
                    <div className="space-y-1 sm:col-span-2"><Label className="text-xs">LinkedIn</Label><Input value={content.personal.linkedin} onChange={(e) => updatePersonal("linkedin", e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Professional Summary</Label><Textarea value={content.personal.summary} onChange={(e) => updatePersonal("summary", e.target.value)} placeholder="A brief summary of your professional background and goals..." className="min-h-[80px]" /></div>
                </CardContent>
              </Card>

              {/* Experience */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Experience</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={rewritingSection === "experience" || content.experience.length === 0}
                      onClick={() => {
                        const expText = content.experience
                          .map((e) => `${e.title} at ${e.company}\n${e.description.join("\n")}`)
                          .join("\n\n");
                        handleRewriteSection("Experience", expText, (v) => {
                          const lines = v.split("\n").filter((l) => l.trim());
                          if (content.experience.length > 0 && lines.length > 0) {
                            const bullets = lines.filter((l) => l.startsWith("-") || l.startsWith("\u2022")).map((l) => l.replace(/^[-\u2022]\s*/, ""));
                            if (bullets.length > 0) {
                              updateExperienceBullet(0, 0, bullets.join("\n"));
                            }
                          }
                        });
                      }}
                    >
                      {rewritingSection === "experience" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Wand2 className="size-3" />
                      )}
                      Rewrite
                    </Button>
                    <Button variant="outline" size="sm" onClick={addExperience}><Plus className="size-3.5" /> Add</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {content.experience.length === 0 && <p className="text-xs text-muted-foreground">No experience added yet.</p>}
                  {content.experience.map((exp, idx) => (
                    <div key={idx} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <button className="text-xs font-medium flex items-center gap-1 hover:text-primary" onClick={() => setExpandedExp((p) => ({ ...p, [idx]: p[idx] === undefined ? false : !p[idx] }))}>
                          {expandedExp[idx] !== false ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          {exp.title || exp.company || "Untitled Experience"}
                        </button>
                        <Button variant="ghost" size="icon-xs" onClick={() => removeExperience(idx)}><Trash2 className="size-3 text-destructive" /></Button>
                      </div>
                      {expandedExp[idx] !== false && (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1"><Label className="text-xs">Job Title</Label><Input value={exp.title} onChange={(e) => updateExperience(idx, "title", e.target.value)} placeholder="Software Engineer" /></div>
                            <div className="space-y-1"><Label className="text-xs">Company</Label><Input value={exp.company} onChange={(e) => updateExperience(idx, "company", e.target.value)} placeholder="Google" /></div>
                            <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={exp.location} onChange={(e) => updateExperience(idx, "location", e.target.value)} placeholder="Mountain View, CA" /></div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1"><Label className="text-xs">Start</Label><Input value={exp.startDate} onChange={(e) => updateExperience(idx, "startDate", e.target.value)} placeholder="Jan 2023" /></div>
                              <div className="space-y-1"><Label className="text-xs">End</Label><Input value={exp.endDate} onChange={(e) => updateExperience(idx, "endDate", e.target.value)} placeholder="Present" /></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between"><Label className="text-xs">Bullet Points</Label><Button variant="ghost" size="xs" onClick={() => addExperienceBullet(idx)}><Plus className="size-3" /> Add bullet</Button></div>
                            {exp.description.map((d, di) => (
                              <div key={di} className="flex gap-1.5">
                                <Textarea value={d} onChange={(e) => updateExperienceBullet(idx, di, e.target.value)} placeholder="Describe your achievement..." className="min-h-[36px] text-xs" />
                                <Button variant="ghost" size="icon-xs" className="shrink-0" onClick={() => removeExperienceBullet(idx, di)}><Trash2 className="size-3" /></Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Education */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Education</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={rewritingSection === "education" || content.education.length === 0}
                      onClick={() => {
                        const eduText = content.education.map((e) => `${e.title} at ${e.company}`).join("\n");
                        handleRewriteSection("Education", eduText, () => {});
                      }}
                    >
                      {rewritingSection === "education" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Wand2 className="size-3" />
                      )}
                      Rewrite
                    </Button>
                    <Button variant="outline" size="sm" onClick={addEducation}><Plus className="size-3.5" /> Add</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {content.education.length === 0 && <p className="text-xs text-muted-foreground">No education added yet.</p>}
                  {content.education.map((edu, idx) => (
                    <div key={idx} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{edu.title || edu.company || "Untitled Education"}</span>
                        <Button variant="ghost" size="icon-xs" onClick={() => removeEducation(idx)}><Trash2 className="size-3 text-destructive" /></Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1"><Label className="text-xs">Degree / Program</Label><Input value={edu.title} onChange={(e) => updateEducation(idx, "title", e.target.value)} placeholder="B.S. Computer Science" /></div>
                        <div className="space-y-1"><Label className="text-xs">School</Label><Input value={edu.company} onChange={(e) => updateEducation(idx, "company", e.target.value)} placeholder="MIT" /></div>
                        <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={edu.location} onChange={(e) => updateEducation(idx, "location", e.target.value)} placeholder="Cambridge, MA" /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1"><Label className="text-xs">Start</Label><Input value={edu.startDate} onChange={(e) => updateEducation(idx, "startDate", e.target.value)} placeholder="Sep 2019" /></div>
                          <div className="space-y-1"><Label className="text-xs">End</Label><Input value={edu.endDate} onChange={(e) => updateEducation(idx, "endDate", e.target.value)} placeholder="Jun 2023" /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Projects */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Projects</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={rewritingSection === "projects" || content.projects.length === 0}
                      onClick={() => {
                        const projText = content.projects.map((p) => `${p.name}: ${p.description}`).join("\n");
                        handleRewriteSection("Projects", projText, () => {});
                      }}
                    >
                      {rewritingSection === "projects" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Wand2 className="size-3" />
                      )}
                      Rewrite
                    </Button>
                    <Button variant="outline" size="sm" onClick={addProject}><Plus className="size-3.5" /> Add</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {content.projects.length === 0 && <p className="text-xs text-muted-foreground">No projects added yet.</p>}
                  {content.projects.map((proj, idx) => (
                    <div key={idx} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{proj.name || "Untitled Project"}</span>
                        <Button variant="ghost" size="icon-xs" onClick={() => removeProject(idx)}><Trash2 className="size-3 text-destructive" /></Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1"><Label className="text-xs">Project Name</Label><Input value={proj.name} onChange={(e) => updateProject(idx, "name", e.target.value)} placeholder="My Awesome Project" /></div>
                        <div className="space-y-1"><Label className="text-xs">Link</Label><Input value={proj.link} onChange={(e) => updateProject(idx, "link", e.target.value)} placeholder="https://..." /></div>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={proj.description} onChange={(e) => updateProject(idx, "description", e.target.value)} placeholder="Brief description of the project..." className="min-h-[60px]" /></div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Technologies</Label>
                        <div className="flex flex-wrap gap-1">
                          {proj.technologies.map((t, ti) => (
                            <Badge key={ti} variant="secondary" className="text-[10px]">
                              {t}
                              <button className="ml-1 hover:text-destructive" onClick={() => updateProject(idx, "technologies", proj.technologies.filter((_, i) => i !== ti))}>
                                &times;
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            value={techProjectIndex === idx ? techInput : ""}
                            onChange={(e) => { setTechInput(e.target.value); setTechProjectIndex(idx); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && techInput.trim() && techProjectIndex === idx) {
                                e.preventDefault();
                                updateProject(idx, "technologies", [...proj.technologies, techInput.trim()]);
                                setTechInput("");
                              }
                            }}
                            placeholder="Add technology..."
                            className="h-7 text-xs"
                          />
                          <Button variant="ghost" size="icon-xs" onClick={() => { if (techInput.trim() && techProjectIndex === idx) { updateProject(idx, "technologies", [...proj.technologies, techInput.trim()]); setTechInput(""); } }}>
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Skills</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={rewritingSection === "skills" || content.skills.length === 0}
                    onClick={() =>
                      handleRewriteSection("Skills", content.skills.join(", "), () => {})
                    }
                  >
                    {rewritingSection === "skills" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Wand2 className="size-3" />
                    )}
                    Suggest
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {content.skills.map((s, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px]">
                        {s}
                        <button className="ml-1 hover:text-destructive" onClick={() => removeSkill(idx)}>&times;</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); setSkillInput(""); } }} placeholder="Type a skill and press Enter..." className="h-7 text-xs" />
                    <Button variant="ghost" size="icon-xs" onClick={() => { addSkill(skillInput); setSkillInput(""); }}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Certifications</CardTitle>
                  <Button variant="outline" size="sm" onClick={addCertification}><Plus className="size-3.5" /> Add</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {content.certifications.length === 0 && <p className="text-xs text-muted-foreground">No certifications added yet.</p>}
                  {content.certifications.map((cert, idx) => (
                    <div key={idx} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{cert.title || "Untitled Certification"}</span>
                        <Button variant="ghost" size="icon-xs" onClick={() => removeCertification(idx)}><Trash2 className="size-3 text-destructive" /></Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1"><Label className="text-xs">Certification Name</Label><Input value={cert.title} onChange={(e) => updateCertification(idx, "title", e.target.value)} placeholder="AWS Solutions Architect" /></div>
                        <div className="space-y-1"><Label className="text-xs">Issuer</Label><Input value={cert.company} onChange={(e) => updateCertification(idx, "company", e.target.value)} placeholder="Amazon" /></div>
                        <div className="space-y-1"><Label className="text-xs">Date</Label><Input value={cert.startDate} onChange={(e) => updateCertification(idx, "startDate", e.target.value)} placeholder="Mar 2024" /></div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Languages */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Languages</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={rewritingSection === "languages" || content.languages.length === 0}
                    onClick={() =>
                      handleRewriteSection("Languages", content.languages.join(", "), () => {})
                    }
                  >
                    {rewritingSection === "languages" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Wand2 className="size-3" />
                    )}
                    Suggest
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {content.languages.map((l, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px]">
                        {l}
                        <button className="ml-1 hover:text-destructive" onClick={() => removeLanguage(idx)}>&times;</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Input value={langInput} onChange={(e) => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLanguage(langInput); setLangInput(""); } }} placeholder="Type a language and press Enter..." className="h-7 text-xs" />
                    <Button variant="ghost" size="icon-xs" onClick={() => { addLanguage(langInput); setLangInput(""); }}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right preview */}
            <div className="hidden xl:block">
              <div className="sticky top-4">
                <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Eye className="size-3.5" />
                  Live Preview
                </div>
                <div className="overflow-auto rounded-lg border bg-muted/30 p-2" style={{ maxHeight: "calc(100vh - 12rem)" }}>
                  <div className="origin-top-left" style={{ transform: "scale(0.65)", transformOrigin: "top left" }}>
                    <ResumePreview ref={previewRef} content={content} template={templateId} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analyze">
          <div className="mt-4">
            <ResumeAnalyzer analyses={pastAnalyses} />
          </div>
        </TabsContent>

        <TabsContent value="cover-letter">
          <div className="mt-4">
            <CoverLetterBuilder resumeContent={content} />
          </div>
        </TabsContent>

        <TabsContent value="tailor">
          <div className="mt-4">
            <ResumeTailor resumeContent={content} onUpdate={(c) => { setContent(c); markDirty(); }} />
          </div>
        </TabsContent>

        <TabsContent value="diff">
          <div className="mt-4">
            <VersionDiff versions={resumes} />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Resume</DialogTitle>
            <DialogDescription>Give your resume a name.</DialogDescription>
          </DialogHeader>
          <Input value={newResumeTitle} onChange={(e) => setNewResumeTitle(e.target.value)} placeholder="e.g. Software Engineer Resume" autoFocus />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
