"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Mail,
  Loader2,
  Copy,
  Download,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { ResumeContent } from "@/server/actions/resume.actions";

type CoverLetterEntry = {
  id: string;
  company: string;
  role: string;
  content: string;
  createdAt: string;
};

type Props = {
  resumeContent: ResumeContent;
};

export function CoverLetterBuilder({ resumeContent }: Props) {
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jdDescription, setJdDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [letterContent, setLetterContent] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [savedLetters, setSavedLetters] = useState<CoverLetterEntry[]>([]);

  const handleGenerate = useCallback(async () => {
    if (!targetCompany.trim() || !targetRole.trim()) {
      toast.error("Enter target company and role");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/resume/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent,
          targetCompany: targetCompany.trim(),
          targetRole: targetRole.trim(),
          jdDescription: jdDescription.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate cover letter");
        return;
      }
      setLetterContent(data.coverLetter);
      setAiGenerated(data.aiGenerated);
      toast.success(data.aiGenerated ? "AI cover letter generated" : "Template cover letter generated");
    } catch {
      toast.error("Failed to generate cover letter");
    } finally {
      setGenerating(false);
    }
  }, [resumeContent, targetCompany, targetRole, jdDescription]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(letterContent);
    toast.success("Copied to clipboard");
  }, [letterContent]);

  const handleExportPdf = useCallback(async () => {
    if (!letterContent) return;
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [595, 842] });
      const lines = pdf.splitTextToSize(letterContent, 500);
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(lines, 48, 60);
      pdf.save((targetCompany + "_" + targetRole + "_cover_letter").replace(/[^a-zA-Z0-9_]/g, "_") + ".pdf");
      toast.success("PDF exported");
    } catch {
      toast.error("Failed to export PDF");
    }
  }, [letterContent, targetCompany, targetRole]);

  const handleSave = useCallback(() => {
    if (!letterContent) return;
    const entry: CoverLetterEntry = {
      id: crypto.randomUUID(),
      company: targetCompany,
      role: targetRole,
      content: letterContent,
      createdAt: new Date().toISOString(),
    };
    setSavedLetters((prev) => [entry, ...prev]);
    toast.success("Cover letter saved");
  }, [letterContent, targetCompany, targetRole]);

  const handleDeleteSaved = useCallback((id: string) => {
    setSavedLetters((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleLoadSaved = useCallback((entry: CoverLetterEntry) => {
    setTargetCompany(entry.company);
    setTargetRole(entry.role);
    setLetterContent(entry.content);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4" />
            Cover Letter Generator
          </CardTitle>
          <CardDescription>
            Generate a tailored cover letter for a specific role and company.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Target Company</Label>
              <Input
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Google"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Role</Label>
              <Input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Job Description (optional)</Label>
            <Textarea
              value={jdDescription}
              onChange={(e) => setJdDescription(e.target.value)}
              placeholder="Paste the job description here for a more tailored cover letter..."
              className="min-h-[100px]"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button onClick={handleGenerate} disabled={generating || !targetCompany.trim() || !targetRole.trim()}>
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {generating ? "Generating..." : "Generate Cover Letter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {letterContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Generated Cover Letter</CardTitle>
                <CardDescription>
                  {aiGenerated ? "AI-generated" : "Template-based"} for {targetRole} at {targetCompany}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={aiGenerated ? "default" : "secondary"} className="text-[10px]">
                  {aiGenerated ? "AI" : "Template"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={letterContent}
              onChange={(e) => setLetterContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="size-3.5" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf}>
                <Download className="size-3.5" /> Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="size-3.5" /> Save Version
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {savedLetters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Saved Cover Letters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {savedLetters.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
              >
                <button
                  className="text-left text-sm hover:text-primary"
                  onClick={() => handleLoadSaved(entry)}
                >
                  <div className="font-medium">{entry.role} at {entry.company}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleDeleteSaved(entry.id)}
                >
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
