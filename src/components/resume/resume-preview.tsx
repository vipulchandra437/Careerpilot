"use client";

import { forwardRef } from "react";
import type { TemplateId } from "@/components/resume/template-selector";
import type { ResumeContent } from "@/server/actions/resume.actions";

type Props = {
  content: ResumeContent;
  template: TemplateId;
};

const ResumePreview = forwardRef<HTMLDivElement, Props>(
  ({ content, template }, ref) => {
    const p = content.personal;
    const hasAnyContent = p.name || p.summary || content.experience.length || content.education.length || content.skills.length;

    if (!hasAnyContent) {
      return (
        <div
          ref={ref}
          className="flex h-[842px] w-[595px] flex-col items-center justify-center bg-white text-gray-400 shadow-lg"
        >
          <p className="text-lg font-medium">Resume preview</p>
          <p className="mt-1 text-sm">Start filling in your details to see a preview</p>
        </div>
      );
    }

    switch (template) {
      case "modern":
        return <ModernTemplate ref={ref} content={content} />;
      case "classic":
        return <ClassicTemplate ref={ref} content={content} />;
      case "minimal":
        return <MinimalTemplate ref={ref} content={content} />;
      case "professional":
        return <ProfessionalTemplate ref={ref} content={content} />;
      default:
        return <ModernTemplate ref={ref} content={content} />;
    }
  }
);

ResumePreview.displayName = "ResumePreview";

function formatDateRange(start: string, end: string) {
  if (!start && !end) return "";
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - Present`;
  return end;
}

const ModernTemplate = forwardRef<HTMLDivElement, { content: ResumeContent }>(
  ({ content }, ref) => {
    const p = content.personal;
    return (
      <div ref={ref} className="flex h-[842px] w-[595px] bg-white text-gray-900 shadow-lg" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <div className="w-[180px] shrink-0 bg-[#2b3a67] p-5 text-white">
          <h1 className="text-xl font-bold leading-tight">{p.name || "Your Name"}</h1>
          <p className="mt-1 text-xs text-blue-200">{p.title || "Job Title"}</p>

          <div className="mt-5 space-y-3 text-[10px]">
            {p.email && <SectionItem label="Email" value={p.email} light />}
            {p.phone && <SectionItem label="Phone" value={p.phone} light />}
            {p.location && <SectionItem label="Location" value={p.location} light />}
            {p.website && <SectionItem label="Website" value={p.website} light />}
            {p.linkedin && <SectionItem label="LinkedIn" value={p.linkedin} light />}
          </div>

          {content.skills.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-blue-200">Skills</h3>
              <div className="flex flex-wrap gap-1">
                {content.skills.map((s, i) => (
                  <span key={i} className="rounded bg-[#3d4f80] px-1.5 py-0.5 text-[9px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {content.languages.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-200">Languages</h3>
              <div className="space-y-1 text-[10px]">
                {content.languages.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          )}

          {content.certifications.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-200">Certifications</h3>
              <div className="space-y-1.5 text-[10px]">
                {content.certifications.map((c, i) => (
                  <div key={i}>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-blue-200">{c.company}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 p-5">
          {p.summary && (
            <section className="mb-4">
              <h2 className="mb-1.5 border-b-2 border-[#2b3a67] pb-1 text-sm font-bold uppercase tracking-wider text-[#2b3a67]">
                Summary
              </h2>
              <p className="text-[10px] leading-relaxed text-gray-700">{p.summary}</p>
            </section>
          )}

          {content.experience.length > 0 && (
            <section className="mb-4">
              <h2 className="mb-1.5 border-b-2 border-[#2b3a67] pb-1 text-sm font-bold uppercase tracking-wider text-[#2b3a67]">
                Experience
              </h2>
              {content.experience.map((e, i) => (
                <div key={i} className="mb-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold">{e.title}</span>
                    <span className="text-[9px] text-gray-500">{formatDateRange(e.startDate, e.endDate)}</span>
                  </div>
                  <div className="text-[10px] text-gray-600">{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {e.description.map((d, j) => (
                      <li key={j} className="text-[9.5px] leading-relaxed text-gray-700 list-disc">{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {content.education.length > 0 && (
            <section className="mb-4">
              <h2 className="mb-1.5 border-b-2 border-[#2b3a67] pb-1 text-sm font-bold uppercase tracking-wider text-[#2b3a67]">
                Education
              </h2>
              {content.education.map((e, i) => (
                <div key={i} className="mb-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold">{e.title}</span>
                    <span className="text-[9px] text-gray-500">{formatDateRange(e.startDate, e.endDate)}</span>
                  </div>
                  <div className="text-[10px] text-gray-600">{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                </div>
              ))}
            </section>
          )}

          {content.projects.length > 0 && (
            <section className="mb-4">
              <h2 className="mb-1.5 border-b-2 border-[#2b3a67] pb-1 text-sm font-bold uppercase tracking-wider text-[#2b3a67]">
                Projects
              </h2>
              {content.projects.map((proj, i) => (
                <div key={i} className="mb-2">
                  <span className="text-[11px] font-semibold">{proj.name}</span>
                  {proj.link && <span className="ml-1 text-[9px] text-blue-600">{proj.link}</span>}
                  {proj.description && <p className="mt-0.5 text-[9.5px] text-gray-700">{proj.description}</p>}
                  {proj.technologies.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {proj.technologies.map((t, j) => (
                        <span key={j} className="rounded bg-gray-100 px-1 py-0.5 text-[8px] text-gray-600">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    );
  }
);

ModernTemplate.displayName = "ModernTemplate";

const ClassicTemplate = forwardRef<HTMLDivElement, { content: ResumeContent }>(
  ({ content }, ref) => {
    const p = content.personal;
    return (
      <div ref={ref} className="flex h-[842px] w-[595px] flex-col bg-white p-6 text-gray-900 shadow-lg" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        <header className="mb-3 text-center border-b-2 border-gray-900 pb-3">
          <h1 className="text-2xl font-bold tracking-wide">{p.name || "Your Name"}</h1>
          <p className="text-sm text-gray-600 italic mt-0.5">{p.title || "Job Title"}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-gray-600">
            {p.email && <span>{p.email}</span>}
            {p.phone && <span>{p.phone}</span>}
            {p.location && <span>{p.location}</span>}
            {p.website && <span>{p.website}</span>}
            {p.linkedin && <span>{p.linkedin}</span>}
          </div>
        </header>

        {p.summary && (
          <section className="mb-3">
            <h2 className="mb-1 border-b border-gray-400 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-800">
              Professional Summary
            </h2>
            <p className="text-[10px] leading-relaxed text-gray-700">{p.summary}</p>
          </section>
        )}

        {content.experience.length > 0 && (
          <section className="mb-3">
            <h2 className="mb-1 border-b border-gray-400 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-800">
              Professional Experience
            </h2>
            {content.experience.map((e, i) => (
              <div key={i} className="mb-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold">{e.title}</span>
                  <span className="text-[9px] italic text-gray-500">{formatDateRange(e.startDate, e.endDate)}</span>
                </div>
                <div className="text-[10px] italic text-gray-600">{e.company}{e.location ? ` - ${e.location}` : ""}</div>
                <ul className="mt-1 space-y-0.5 pl-3">
                  {e.description.map((d, j) => (
                    <li key={j} className="text-[9.5px] leading-relaxed text-gray-700 list-disc">{d}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {content.education.length > 0 && (
          <section className="mb-3">
            <h2 className="mb-1 border-b border-gray-400 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-800">
              Education
            </h2>
            {content.education.map((e, i) => (
              <div key={i} className="mb-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold">{e.title}</span>
                  <span className="text-[9px] italic text-gray-500">{formatDateRange(e.startDate, e.endDate)}</span>
                </div>
                <div className="text-[10px] italic text-gray-600">{e.company}{e.location ? ` - ${e.location}` : ""}</div>
              </div>
            ))}
          </section>
        )}

        {content.projects.length > 0 && (
          <section className="mb-3">
            <h2 className="mb-1 border-b border-gray-400 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-800">
              Projects
            </h2>
            {content.projects.map((proj, i) => (
              <div key={i} className="mb-1.5">
                <span className="text-[11px] font-bold">{proj.name}</span>
                {proj.link && <span className="ml-1 text-[9px] italic text-gray-500">({proj.link})</span>}
                {proj.description && <p className="mt-0.5 text-[9.5px] text-gray-700">{proj.description}</p>}
                {proj.technologies.length > 0 && (
                  <p className="text-[9px] italic text-gray-500 mt-0.5">Tech: {proj.technologies.join(", ")}</p>
                )}
              </div>
            ))}
          </section>
        )}

        <div className="flex gap-6 text-[10px]">
          {content.skills.length > 0 && (
            <section className="flex-1">
              <h2 className="mb-1 border-b border-gray-400 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-800">
                Skills
              </h2>
              <div className="text-gray-700">{content.skills.join(" · ")}</div>
            </section>
          )}

          {content.languages.length > 0 && (
            <section className="flex-1">
              <h2 className="mb-1 border-b border-gray-400 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-800">
                Languages
              </h2>
              <div className="text-gray-700">{content.languages.join(" · ")}</div>
            </section>
          )}
        </div>

        {content.certifications.length > 0 && (
          <section className="mt-2">
            <h2 className="mb-1 border-b border-gray-400 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-800">
              Certifications
            </h2>
            <div className="space-y-0.5 text-[10px] text-gray-700">
              {content.certifications.map((c, i) => (
                <div key={i}>{c.title} - {c.company}{c.startDate ? ` (${formatDateRange(c.startDate, c.endDate)})` : ""}</div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }
);

ClassicTemplate.displayName = "ClassicTemplate";

const MinimalTemplate = forwardRef<HTMLDivElement, { content: ResumeContent }>(
  ({ content }, ref) => {
    const p = content.personal;
    return (
      <div ref={ref} className="flex h-[842px] w-[595px] flex-col bg-white p-8 text-gray-900 shadow-lg" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
        <header className="mb-5">
          <h1 className="text-2xl font-light tracking-tight">{p.name || "Your Name"}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{p.title || "Job Title"}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-400">
            {p.email && <span>{p.email}</span>}
            {p.phone && <span>· {p.phone}</span>}
            {p.location && <span>· {p.location}</span>}
            {p.website && <span>· {p.website}</span>}
            {p.linkedin && <span>· {p.linkedin}</span>}
          </div>
        </header>

        {p.summary && (
          <section className="mb-4">
            <p className="text-[10.5px] leading-relaxed text-gray-600">{p.summary}</p>
          </section>
        )}

        {content.experience.length > 0 && (
          <section className="mb-4">
            <h2 className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">Experience</h2>
            <div className="space-y-3">
              {content.experience.map((e, i) => (
                <div key={i} className="border-l-2 border-gray-100 pl-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold">{e.title}</span>
                    <span className="text-[9px] text-gray-400">{formatDateRange(e.startDate, e.endDate)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                  <ul className="mt-1 space-y-0.5">
                    {e.description.map((d, j) => (
                      <li key={j} className="text-[9.5px] leading-relaxed text-gray-600">{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {content.education.length > 0 && (
          <section className="mb-4">
            <h2 className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">Education</h2>
            <div className="space-y-2">
              {content.education.map((e, i) => (
                <div key={i} className="border-l-2 border-gray-100 pl-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold">{e.title}</span>
                    <span className="text-[9px] text-gray-400">{formatDateRange(e.startDate, e.endDate)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">{e.company}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {content.projects.length > 0 && (
          <section className="mb-4">
            <h2 className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">Projects</h2>
            <div className="space-y-2">
              {content.projects.map((proj, i) => (
                <div key={i} className="border-l-2 border-gray-100 pl-3">
                  <span className="text-[11px] font-semibold">{proj.name}</span>
                  {proj.description && <p className="mt-0.5 text-[9.5px] text-gray-600">{proj.description}</p>}
                  {proj.technologies.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {proj.technologies.map((t, j) => (
                        <span key={j} className="text-[8px] text-gray-400">{t}{j < proj.technologies.length - 1 ? "," : ""}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex gap-8">
          {content.skills.length > 0 && (
            <section className="flex-1">
              <h2 className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">Skills</h2>
              <div className="flex flex-wrap gap-1">
                {content.skills.map((s, i) => (
                  <span key={i} className="text-[9.5px] text-gray-600">{s}{i < content.skills.length - 1 ? "," : ""}</span>
                ))}
              </div>
            </section>
          )}
          {content.languages.length > 0 && (
            <section className="flex-1">
              <h2 className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">Languages</h2>
              <div className="text-[9.5px] text-gray-600">{content.languages.join(", ")}</div>
            </section>
          )}
        </div>

        {content.certifications.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">Certifications</h2>
            <div className="space-y-0.5 text-[9.5px] text-gray-600">
              {content.certifications.map((c, i) => (
                <div key={i}>{c.title} — {c.company}</div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }
);

MinimalTemplate.displayName = "MinimalTemplate";

const ProfessionalTemplate = forwardRef<HTMLDivElement, { content: ResumeContent }>(
  ({ content }, ref) => {
    const p = content.personal;
    return (
      <div ref={ref} className="flex h-[842px] w-[595px] bg-white text-gray-900 shadow-lg" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <div className="w-[200px] shrink-0 bg-[#1a1a2e] p-5 text-white">
          <h1 className="text-lg font-bold leading-tight">{p.name || "Your Name"}</h1>
          <p className="mt-1 text-[10px] text-gray-300">{p.title || "Job Title"}</p>

          <div className="mt-5">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Contact</h3>
            <div className="space-y-1.5 text-[9px] text-gray-300">
              {p.email && <div className="break-all">{p.email}</div>}
              {p.phone && <div>{p.phone}</div>}
              {p.location && <div>{p.location}</div>}
              {p.website && <div className="break-all">{p.website}</div>}
              {p.linkedin && <div className="break-all">{p.linkedin}</div>}
            </div>
          </div>

          {content.skills.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Skills</h3>
              <div className="space-y-1">
                {content.skills.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px]">
                    <span className="size-1 shrink-0 rounded-full bg-[#e94560]" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.languages.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Languages</h3>
              <div className="space-y-1 text-[9px] text-gray-300">
                {content.languages.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          )}

          {content.certifications.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Certifications</h3>
              <div className="space-y-1.5 text-[9px] text-gray-300">
                {content.certifications.map((c, i) => (
                  <div key={i}>
                    <div className="font-medium text-white">{c.title}</div>
                    <div>{c.company}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 p-5">
          {p.summary && (
            <section className="mb-4">
              <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1a1a2e]">
                Professional Summary
              </h2>
              <div className="h-[1px] bg-[#e94560] mb-2" />
              <p className="text-[10px] leading-relaxed text-gray-700">{p.summary}</p>
            </section>
          )}

          {content.experience.length > 0 && (
            <section className="mb-4">
              <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1a1a2e]">
                Experience
              </h2>
              <div className="h-[1px] bg-[#e94560] mb-2" />
              {content.experience.map((e, i) => (
                <div key={i} className="mb-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold">{e.title}</span>
                    <span className="text-[9px] text-gray-500">{formatDateRange(e.startDate, e.endDate)}</span>
                  </div>
                  <div className="text-[10px] text-gray-600">{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {e.description.map((d, j) => (
                      <li key={j} className="text-[9.5px] leading-relaxed text-gray-700 list-disc">{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {content.education.length > 0 && (
            <section className="mb-4">
              <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1a1a2e]">
                Education
              </h2>
              <div className="h-[1px] bg-[#e94560] mb-2" />
              {content.education.map((e, i) => (
                <div key={i} className="mb-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold">{e.title}</span>
                    <span className="text-[9px] text-gray-500">{formatDateRange(e.startDate, e.endDate)}</span>
                  </div>
                  <div className="text-[10px] text-gray-600">{e.company}</div>
                </div>
              ))}
            </section>
          )}

          {content.projects.length > 0 && (
            <section className="mb-4">
              <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1a1a2e]">
                Projects
              </h2>
              <div className="h-[1px] bg-[#e94560] mb-2" />
              {content.projects.map((proj, i) => (
                <div key={i} className="mb-2">
                  <span className="text-[11px] font-semibold">{proj.name}</span>
                  {proj.link && <span className="ml-1 text-[9px] text-blue-600">{proj.link}</span>}
                  {proj.description && <p className="mt-0.5 text-[9.5px] text-gray-700">{proj.description}</p>}
                  {proj.technologies.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {proj.technologies.map((t, j) => (
                        <span key={j} className="rounded bg-gray-100 px-1 py-0.5 text-[8px] text-gray-600">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    );
  }
);

ProfessionalTemplate.displayName = "ProfessionalTemplate";

function SectionItem({ label, value, light }: { label: string; value: string; light?: boolean }) {
  return (
    <div>
      <div className={`text-[8px] uppercase tracking-wider ${light ? "text-blue-300" : "text-gray-400"}`}>{label}</div>
      <div className={`text-[9px] ${light ? "text-white" : "text-gray-700"}`}>{value}</div>
    </div>
  );
}

export { ResumePreview };
