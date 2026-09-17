"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type BuilderContent } from "@/lib/validators/builder";

interface BuilderFormProps {
  content: BuilderContent;
  onUpdateContact: (field: string, value: string) => void;
  onUpdateField: (section: keyof BuilderContent, index: number, field: string, value: string) => void;
  onAddItem: (section: keyof BuilderContent) => void;
  onRemoveItem: (section: keyof BuilderContent, index: number) => void;
  onMoveItem: (section: keyof BuilderContent, index: number, direction: "up" | "down") => void;
  onPolish: (section: keyof BuilderContent, index: number, field: string) => void;
}

// WHY one form component: all sections share the same add/remove/reorder/polish
// pattern, so a single component with a config-driven render keeps duplication low.

export function BuilderForm({
  content,
  onUpdateContact,
  onUpdateField,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  onPolish,
}: BuilderFormProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    contact: true,
    summary: true,
    education: true,
    skills: true,
    projects: true,
    experience: true,
  });

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">
      {/* Contact */}
      <Section title="Contact" expanded={expanded.contact} onToggle={() => toggle("contact")}>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={content.contact.name} onChange={(e) => onUpdateContact("name", e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={content.contact.email} onChange={(e) => onUpdateContact("email", e.target.value)} placeholder="jane@example.com" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={content.contact.phone} onChange={(e) => onUpdateContact("phone", e.target.value)} placeholder="+1 (555) 123-4567" />
          </div>
          <div>
            <Label htmlFor="links">Links (one per line)</Label>
            <Textarea
              id="links"
              value={content.contact.links.join("\n")}
              onChange={(e) => onUpdateContact("links", e.target.value.split("\n").filter(Boolean) as unknown as string)}
              placeholder="https://github.com/janedoe\nhttps://linkedin.com/in/janedoe"
              rows={3}
            />
          </div>
        </div>
      </Section>

      {/* Summary */}
      <Section title="Summary" expanded={expanded.summary} onToggle={() => toggle("summary")}>
        <div>
          <Label htmlFor="summary">Professional Summary</Label>
          <Textarea
            id="summary"
            value={content.summary}
            onChange={(e) => onUpdateField("summary", 0, "text", e.target.value)}
            placeholder="A brief summary of your background and goals..."
            rows={4}
          />
        </div>
      </Section>

      {/* Education */}
      <RepeatableSection
        title="Education"
        expanded={expanded.education}
        onToggle={() => toggle("education")}
        items={content.education}
        onAdd={() => onAddItem("education")}
        onRemove={(i) => onRemoveItem("education", i)}
        onMove={(i, d) => onMoveItem("education", i, d)}
        fields={["institution", "degree", "year"]}
        labels={{ institution: "Institution", degree: "Degree", year: "Year" }}
        onUpdate={onUpdateField}
        section="education"
        onPolish={onPolish}
        itemType="object"
      />

      {/* Skills */}
      <RepeatableSection
        title="Skills"
        expanded={expanded.skills}
        onToggle={() => toggle("skills")}
        items={content.skills}
        onAdd={() => onAddItem("skills")}
        onRemove={(i) => onRemoveItem("skills", i)}
        onMove={(i, d) => onMoveItem("skills", i, d)}
        fields={["name"]}
        labels={{ name: "Skill" }}
        onUpdate={onUpdateField}
        section="skills"
        onPolish={onPolish}
        itemType="string"
      />

      {/* Projects */}
      <RepeatableSection
        title="Projects"
        expanded={expanded.projects}
        onToggle={() => toggle("projects")}
        items={content.projects}
        onAdd={() => onAddItem("projects")}
        onRemove={(i) => onRemoveItem("projects", i)}
        onMove={(i, d) => onMoveItem("projects", i, d)}
        fields={["name", "description", "tech"]}
        labels={{ name: "Project Name", description: "Description", tech: "Tech (comma-separated)" }}
        onUpdate={onUpdateField}
        section="projects"
        onPolish={onPolish}
        itemType="object"
      />

      {/* Experience */}
      <RepeatableSection
        title="Experience"
        expanded={expanded.experience}
        onToggle={() => toggle("experience")}
        items={content.experience}
        onAdd={() => onAddItem("experience")}
        onRemove={(i) => onRemoveItem("experience", i)}
        onMove={(i, d) => onMoveItem("experience", i, d)}
        fields={["company", "role", "duration", "description"]}
        labels={{ company: "Company", role: "Role", duration: "Duration", description: "Description" }}
        onUpdate={onUpdateField}
        section="experience"
        onPolish={onPolish}
        itemType="object"
      />
    </div>
  );
}

// WHY a shared section wrapper: every section needs a collapsible header with the
// same visual treatment. Extracting it means one place to tweak the collapse UX.

function Section({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {expanded && <div className="border-t border-border px-4 py-4">{children}</div>}
    </div>
  );
}

// WHY repeatable section abstracts the up/down/remove/add pattern: every array
// section in the builder uses the exact same controls. One generic component beats
// five near-identical blocks.

function RepeatableSection({
  title,
  expanded,
  onToggle,
  items,
  onAdd,
  onRemove,
  onMove,
  fields,
  labels,
  onUpdate,
  section,
  onPolish,
  itemType,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  items: unknown[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  fields: string[];
  labels: Record<string, string>;
  onUpdate: (section: keyof import("@/lib/validators/builder").BuilderContent, index: number, field: string, value: string) => void;
  section: keyof import("@/lib/validators/builder").BuilderContent;
  onPolish: (section: keyof import("@/lib/validators/builder").BuilderContent, index: number, field: string) => void;
  itemType: "string" | "object";
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <button onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {items.map((item, index) => {
            if (itemType === "string") {
              const value = typeof item === "string" ? item : "";
              return (
                <div key={index} className="rounded-md border border-border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onMove(index, "up")} disabled={index === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move up">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button onClick={() => onMove(index, "down")} disabled={index === items.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move down">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button onClick={() => onRemove(index)} className="p-1 text-red-600 hover:text-red-700" title="Remove">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                  <Input
                    value={value}
                    onChange={(e) => onUpdate(section, index, "name", e.target.value)}
                    placeholder={labels.name}
                  />
                </div>
              );
            }

            const itemRecord = item as Record<string, unknown>;
            return (
              <div key={index} className="rounded-md border border-border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onMove(index, "up")} disabled={index === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move up">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button onClick={() => onMove(index, "down")} disabled={index === items.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move down">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button onClick={() => onRemove(index)} className="p-1 text-red-600 hover:text-red-700" title="Remove">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                {fields.map((field) => (
                  <div key={field}>
                    <Label htmlFor={`${section}-${index}-${field}`}>{labels[field] ?? field}</Label>
                    {field === "description" ? (
                      <div className="mt-1">
                        <Textarea
                          id={`${section}-${index}-${field}`}
                          value={typeof itemRecord[field] === "string" ? (itemRecord[field] as string) : ""}
                          onChange={(e) => onUpdate(section, index, field, e.target.value)}
                          placeholder={labels[field] ?? ""}
                          rows={3}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-7 text-xs"
                          onClick={() => onPolish(section, index, field)}
                        >
                          Improve with AI
                        </Button>
                      </div>
                    ) : field === "tech" ? (
                      <Input
                        id={`${section}-${index}-${field}`}
                        value={Array.isArray(itemRecord[field]) ? (itemRecord[field] as string[]).join(", ") : ""}
                        onChange={(e) => onUpdate(section, index, field, e.target.value)}
                        placeholder={labels[field] ?? ""}
                      />
                    ) : (
                      <Input
                        id={`${section}-${index}-${field}`}
                        value={typeof itemRecord[field] === "string" ? (itemRecord[field] as string) : ""}
                        onChange={(e) => onUpdate(section, index, field, e.target.value)}
                        placeholder={labels[field] ?? ""}
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={onAdd} className="w-full">
            + Add {title.slice(0, -1)}
          </Button>
        </div>
      )}
    </div>
  );
}
