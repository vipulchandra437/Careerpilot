"use client";

import { cn } from "@/lib/utils";
import { Layout, FileText, Minimize2, Briefcase } from "lucide-react";

export type TemplateId = "modern" | "classic" | "minimal" | "professional";

const templates: { id: TemplateId; label: string; icon: React.ElementType; description: string }[] = [
  { id: "modern", label: "Modern", icon: Layout, description: "Colored sidebar, clean sections" },
  { id: "classic", label: "Classic", icon: FileText, description: "Traditional serif, horizontal lines" },
  { id: "minimal", label: "Minimal", icon: Minimize2, description: "Clean whitespace, thin borders" },
  { id: "professional", label: "Professional", icon: Briefcase, description: "Two-column, dark header" },
];

export function TemplateSelector({
  value,
  onChange,
}: {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {templates.map((t) => {
        const Icon = t.icon;
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all hover:bg-muted",
              active
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border"
            )}
          >
            <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { templates };
