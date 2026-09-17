import { type BuilderContent } from "@/lib/validators/builder";

interface TemplateProps {
  content: BuilderContent;
}

// WHY these templates render plain HTML (not shadcn components): the resume must
// look correct when printed via window.print(). shadcn's Card/Button classes add
// shadows, rounded corners, and hover effects that don't translate to paper.
// Pure semantic HTML with inline print-safe styles gives the printer the exact
// markup it needs.

export function ClassicTemplate({ content }: TemplateProps) {
  const { contact, summary, education, skills, projects, experience } = content;

  return (
    <div className="font-serif text-gray-900 leading-relaxed" style={{ fontSize: "11pt", lineHeight: "1.45" }}>
      {/* Header */}
      <div className="text-center mb-4 pb-3 border-b-2 border-gray-900">
        <h1 className="text-xl font-bold tracking-wide uppercase" style={{ fontSize: "16pt" }}>
          {contact.name || "Your Name"}
        </h1>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-600">
          {contact.email && <span>{contact.email}</span>}
          {contact.phone && <span className="text-gray-400">|</span>}
          {contact.phone && <span>{contact.phone}</span>}
          {contact.links.length > 0 && (
            <>
              <span className="text-gray-400">|</span>
              {contact.links.map((link, i) => (
                <span key={i} className="text-blue-800 underline">
                  {link.replace(/^https?:\/\//, "")}
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">
            Summary
          </h2>
          <p className="text-xs text-gray-800 whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">
            Experience
          </h2>
          <div className="space-y-3">
            {experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-xs">{exp.company}</span>
                  <span className="text-xs text-gray-600">{exp.duration}</span>
                </div>
                <div className="text-xs italic text-gray-700">{exp.role}</div>
                {exp.description && <p className="mt-1 text-xs text-gray-800 whitespace-pre-wrap">{exp.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">
            Projects
          </h2>
          <div className="space-y-2">
            {projects.map((proj, i) => (
              <div key={i}>
                <span className="font-bold text-xs">{proj.name}</span>
                {proj.tech.length > 0 && (
                  <span className="text-xs text-gray-600 ml-1">({proj.tech.join(", ")})</span>
                )}
                {proj.description && <p className="text-xs text-gray-800 mt-0.5">{proj.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education + Skills side by side */}
      <div className="grid grid-cols-3 gap-4">
        {education.length > 0 && (
          <div className="col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">
              Education
            </h2>
            <div className="space-y-2">
              {education.map((edu, i) => (
                <div key={i}>
                  <span className="font-bold text-xs">{edu.institution}</span>
                  <span className="text-xs text-gray-600 ml-1">— {edu.degree}</span>
                  {edu.year && <span className="text-xs text-gray-500 ml-1">({edu.year})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {skills.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">
              Skills
            </h2>
            <p className="text-xs text-gray-800">{skills.join(" • ")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ModernTemplate({ content }: TemplateProps) {
  const { contact, summary, education, skills, projects, experience } = content;

  return (
    <div className="text-gray-900 leading-relaxed" style={{ fontSize: "10.5pt", lineHeight: "1.5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div className="mb-5 pb-3 border-b-2 border-gray-900">
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontSize: "20pt" }}>
          {contact.name || "Your Name"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          {contact.email && <span>{contact.email}</span>}
          {contact.phone && <span>{contact.phone}</span>}
          {contact.links.map((link, i) => (
            <span key={i} className="text-blue-700 underline">
              {link}
            </span>
          ))}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-5">
          <p className="text-xs text-gray-800 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900 border-b border-gray-300 pb-1 mb-3">
            Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
                <div>
                  <div className="font-semibold text-xs">{exp.role}</div>
                  <div className="text-xs text-gray-600">{exp.company}</div>
                </div>
                <div className="text-xs text-gray-500 text-right whitespace-nowrap">{exp.duration}</div>
                {exp.description && (
                  <div className="col-span-2 mt-1 text-xs text-gray-800 whitespace-pre-wrap">{exp.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900 border-b border-gray-300 pb-1 mb-3">
            Projects
          </h2>
          <div className="space-y-3">
            {projects.map((proj, i) => (
              <div key={i}>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-xs">{proj.name}</span>
                  {proj.tech.length > 0 && (
                    <span className="text-xs text-gray-500">({proj.tech.join(", ")})</span>
                  )}
                </div>
                {proj.description && <p className="mt-0.5 text-xs text-gray-800">{proj.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education + Skills */}
      <div className="grid grid-cols-3 gap-6">
        {education.length > 0 && (
          <div className="col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900 border-b border-gray-300 pb-1 mb-3">
              Education
            </h2>
            <div className="space-y-2">
              {education.map((edu, i) => (
                <div key={i}>
                  <span className="font-semibold text-xs">{edu.institution}</span>
                  <span className="text-xs text-gray-600 ml-1">— {edu.degree}</span>
                  {edu.year && <span className="text-xs text-gray-500 ml-1">({edu.year})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {skills.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900 border-b border-gray-300 pb-1 mb-3">
              Skills
            </h2>
            <p className="text-xs text-gray-800 leading-relaxed">{skills.join(" • ")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
