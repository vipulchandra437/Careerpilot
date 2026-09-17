"use client";

import { type BuilderContent } from "@/lib/validators/builder";
import { ClassicTemplate, ModernTemplate } from "./templates";

interface ResumePreviewProps {
  content: BuilderContent;
}

export function ResumePreview({ content }: ResumePreviewProps) {
  const Template = content.template === "classic" ? ClassicTemplate : ModernTemplate;

  return (
    <div className="bg-white shadow-sm print:shadow-none" style={{ aspectRatio: "8.5/11" }}>
      <div className="h-full w-full overflow-auto p-8">
        <Template content={content} />
      </div>
    </div>
  );
}
