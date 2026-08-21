"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, X } from "lucide-react";

interface GroupedSkills {
  category: string;
  label: string;
  skills: { id: string; name: string; category: string }[];
}

const ratingOptions = [1, 2, 3, 4, 5];

function RatingSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="h-7 w-24 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ratingOptions.map((r) => (
          <SelectItem key={r} value={String(r)}>
            {r === 1 ? "1 — Beginner" : r === 5 ? "5 — Expert" : `${r}/5`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileForm({
  user,
  profile,
  groupedSkills,
  currentRatings,
}: {
  user: { name: string; email: string; image?: string | null };
  profile: {
    location: string | null;
    bio: string | null;
    experienceLevel: string | null;
    studyHoursPerWeek: number | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    photoUrl: string | null;
    onboardingCompletedAt: Date | null;
    targetCompanyId: string | null;
    education: {
      college: string | null;
      degree: string | null;
      branch: string | null;
      graduationYear: number | null;
      cgpa: number | null;
    } | null;
  } | null;
  groupedSkills: GroupedSkills[];
  currentRatings: Record<string, number>;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("personal");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile?.photoUrl ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [name, setName] = useState(user.name);
  const [location, setLocation] = useState(profile?.location ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [experienceLevel, setExperienceLevel] = useState<string>(profile?.experienceLevel ?? "");
  const [studyHours, setStudyHours] = useState<string>(profile?.studyHoursPerWeek?.toString() ?? "");

  const [college, setCollege] = useState(profile?.education?.college ?? "");
  const [degree, setDegree] = useState(profile?.education?.degree ?? "");
  const [branch, setBranch] = useState(profile?.education?.branch ?? "");
  const [gradYear, setGradYear] = useState(profile?.education?.graduationYear?.toString() ?? "");
  const [cgpa, setCgpa] = useState(profile?.education?.cgpa?.toString() ?? "");

  const [github, setGithub] = useState(profile?.githubUrl ?? "");
  const [linkedin, setLinkedin] = useState(profile?.linkedinUrl ?? "");
  const [portfolio, setPortfolio] = useState(profile?.portfolioUrl ?? "");

  const [ratings, setRatings] = useState<Record<string, number>>(currentRatings);
  const [skillFilter, setSkillFilter] = useState("");

  const filteredGroups = useMemo(() => {
    const q = skillFilter.trim().toLowerCase();
    if (!q) return groupedSkills;
    return groupedSkills
      .map((g) => ({ ...g, skills: g.skills.filter((s) => s.name.toLowerCase().includes(q)) }))
      .filter((g) => g.skills.length > 0);
  }, [groupedSkills, skillFilter]);

  const selectedCount = Object.values(ratings).filter((r) => r > 0).length;

  function toggleSkill(skillId: string, checked: boolean) {
    setRatings((prev) => {
      const next = { ...prev };
      if (checked) next[skillId] = next[skillId] || 3;
      else delete next[skillId];
      return next;
    });
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo must be under 2MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function uploadPhoto() {
    if (!photoFile) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      const res = await fetch("/api/profile/photo", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to upload photo");
        return;
      }
      const data = await res.json();
      setPhotoUrl(data.url);
      setPhotoPreview(null);
      setPhotoFile(null);
      toast.success("Photo uploaded");
      router.refresh();
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto() {
    try {
      const res = await fetch("/api/profile/photo", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to remove photo");
        return;
      }
      setPhotoUrl(null);
      setPhotoPreview(null);
      setPhotoFile(null);
      toast.success("Photo removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove photo");
    }
  }

  async function save(completeOnboarding: boolean) {
    setSaving(true);
    try {
      const payload = {
        name,
        location,
        bio,
        experienceLevel: experienceLevel || null,
        studyHoursPerWeek: studyHours ? Number(studyHours) : null,
        githubUrl: github,
        linkedinUrl: linkedin,
        portfolioUrl: portfolio,
        education: {
          college,
          degree,
          branch,
          graduationYear: gradYear ? Number(gradYear) : null,
          cgpa: cgpa ? Number(cgpa) : null,
        },
        skills: Object.entries(ratings).map(([skillId, rating]) => ({ skillId, rating })),
        completeOnboarding,
      };
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to save profile");
        return;
      }
      toast.success("Profile saved");
      if (completeOnboarding) {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const displayPhoto = photoPreview ?? photoUrl;

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="education">Education</TabsTrigger>
        <TabsTrigger value="skills">Skills ({selectedCount})</TabsTrigger>
        <TabsTrigger value="links">Links</TabsTrigger>
      </TabsList>

      <TabsContent value="personal">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <CardDescription>Basic information about you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary/50"
                >
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt="Profile photo"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">
                      {getInitials(name || "U")}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="size-5 text-white" />
                  </div>
                </button>
                {photoUrl && !photoPreview && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <div className="flex flex-col gap-2 text-center sm:text-left">
                <p className="text-sm text-muted-foreground">
                  Click the circle to upload a profile photo.
                </p>
                <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. Max 2MB.</p>
                {photoFile && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={uploadPhoto} disabled={uploadingPhoto}>
                      {uploadingPhoto ? "Uploading..." : "Save photo"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bengaluru, India" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Short bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="CS student passionate about AI and building products..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Experience level</Label>
                <Select value={experienceLevel || undefined} onValueChange={(v) => setExperienceLevel(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRY">Entry / Student</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="EXPERIENCED">Experienced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="studyHours">Study hours per week</Label>
                <Input
                  id="studyHours"
                  type="number"
                  min={0}
                  max={80}
                  value={studyHours}
                  onChange={(e) => setStudyHours(e.target.value)}
                  placeholder="e.g. 15"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => save(false)} disabled={saving}>
                Save profile
              </Button>
              {!profile?.onboardingCompletedAt && (
                <Button onClick={() => save(true)} disabled={saving}>
                  Save & complete onboarding
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="education">
        <Card>
          <CardHeader>
            <CardTitle>Education</CardTitle>
            <CardDescription>Your academic background.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="college">College / University</Label>
                <Input id="college" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="MIT, IIT..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="degree">Degree</Label>
                <Input id="degree" value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="B.Tech in Computer Science" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch / Major</Label>
                <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Computer Science" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gradYear">Graduation year</Label>
                <Input id="gradYear" type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="2027" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cgpa">CGPA / GPA</Label>
                <Input id="cgpa" type="number" step="0.01" min={0} max={10} value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="8.5" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => save(false)} disabled={saving}>
                Save profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="skills">
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>
              Select the skills you know and rate your proficiency (1 = beginner, 5 = expert).
              This drives your skill coverage score.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="skillFilter">Filter skills</Label>
              <Input
                id="skillFilter"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="Search skills..."
              />
            </div>
            {filteredGroups.map((group) => (
              <div key={group.category}>
                <h3 className="mb-2 text-sm font-semibold">{group.label}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.skills.map((s) => {
                    const checked = Boolean(ratings[s.id]);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded-lg border p-2"
                      >
                        <label className="flex flex-1 items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => toggleSkill(s.id, Boolean(c))}
                          />
                          {s.name}
                        </label>
                        {checked && (
                          <RatingSelect
                            value={ratings[s.id]}
                            onChange={(v) => setRatings((prev) => ({ ...prev, [s.id]: v }))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => save(false)} disabled={saving}>
                Save profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="links">
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
            <CardDescription>
              Connect your professional profiles. These power the GitHub, LinkedIn, and project analyzers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github">GitHub URL</Label>
              <Input id="github" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input id="linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio URL</Label>
              <Input id="portfolio" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://your-portfolio.dev" />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => save(false)} disabled={saving}>
                Save profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
