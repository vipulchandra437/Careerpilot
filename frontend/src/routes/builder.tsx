import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  builderApi,
  emptyBuilderContent,
  type BuilderContent,
  type BuilderResume,
} from "@/lib/api";

export const Route = createFileRoute("/builder")({ component: BuilderPage });

const LABELS: Record<string, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone",
  links: "Links (comma separated)",
  summary: "Professional summary",
  education: "Education",
  skills: "Skills (comma separated)",
  experience: "Experience",
  projects: "Projects",
};

function BuilderPage() {
  const [drafts, setDrafts] = useState<BuilderResume[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [content, setContent] = useState<BuilderContent>(emptyBuilderContent());
  const [title, setTitle] = useState("My Resume");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await builderApi.list();
      setDrafts(list);
      if (list.length > 0 && !draftId) {
        setDraftId(list[0].id);
        setTitle(list[0].title);
        setContent(list[0].content);
      }
    } catch {
      setError("Couldn't load your builder resumes.");
    }
  }, [draftId]);

  useEffect(() => {
    void load();
  }, [load]);

  function loadDraft(d: BuilderResume) {
    setDraftId(d.id);
    setTitle(d.title);
    setContent(d.content);
    setNotify(`Loaded “${d.title}”.`);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setNotify(null);
    try {
      const saved = draftId ? await builderApi.update(draftId, title, content) : await builderApi.create(title, content);
      setDraftId(saved.id);
      setNotify("Saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your resume.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draftId) return;
    setBusy(true);
    setError(null);
    try {
      await builderApi.remove(draftId);
      setDraftId(null);
      setContent(emptyBuilderContent());
      setTitle("My Resume");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this resume.");
    } finally {
      setBusy(false);
    }
  }

  function patch(patch: Partial<BuilderContent>) {
    setContent((c) => ({ ...c, ...patch }));
  }

  function setContact(field: "name" | "email" | "phone", value: string) {
    patch({ contact: { ...content.contact, [field]: value } });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-3xl tracking-tight">Resume Builder</h1>
          <p className="mt-2 text-muted">Edit a structured resume and save it to your account.</p>
        </header>

        {drafts.length > 0 ? (
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-medium">Saved drafts</h2>
            <ul className="mt-3 space-y-2">
              {drafts.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => loadDraft(d)}
                    className="flex w-full items-center justify-between rounded-md bg-elevated px-3 py-2 text-left text-sm hover:bg-elevated/70"
                  >
                    <span className={d.id === draftId ? "font-medium text-primary" : ""}>{d.title}</span>
                    <span className="text-xs text-faint">
                      Updated {new Date(d.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Resume title</span>
            <input
              className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <Field label={LABELS.name}>
            <input className="field" value={content.contact.name} onChange={(e) => setContact("name", e.target.value)} />
          </Field>
          <Field label={LABELS.email}>
            <input className="field" value={content.contact.email} onChange={(e) => setContact("email", e.target.value)} />
          </Field>
          <Field label={LABELS.phone}>
            <input className="field" value={content.contact.phone} onChange={(e) => setContact("phone", e.target.value)} />
          </Field>
          <Field label={LABELS.links}>
            <input
              className="field"
              value={content.contact.links.join(", ")}
              onChange={(e) =>
                patch({
                  contact: {
                    ...content.contact,
                    links: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            />
          </Field>
          <Field label={LABELS.summary}>
            <textarea
              rows={3}
              className="w-full rounded-md border border-border bg-elevated p-3 text-sm"
              value={content.summary}
              onChange={(e) => patch({ summary: e.target.value })}
            />
          </Field>
          <Field label={LABELS.skills}>
            <input
              className="field"
              value={content.skills.join(", ")}
              onChange={(e) => patch({ skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
          <ListEditor
            label="Education"
            items={content.education}
            render={(item, set) => (
              <RowInputs
                values={[item.institution, item.degree, item.year]}
                onChange={(v) => set({ institution: v[0], degree: v[1], year: v[2] })}
              />
            )}
            addLabel={({ institution, degree, year }) => `+ ${institution} · ${degree} · ${year}`}
            onAdd={() => patch({ education: [...content.education, { institution: "", degree: "", year: "" }] })}
            onRemove={(i) => patch({ education: content.education.filter((_, j) => j !== i) })}
            onSet={(i, item) => patch({ education: content.education.map((e, j) => (j === i ? item : e)) })}
          />
          <ListEditor
            label="Experience"
            items={content.experience}
            render={(item, set) => (
              <RowBlock values={[item.company, item.role, item.duration, item.description]} onChange={(v) => set({ company: v[0], role: v[1], duration: v[2], description: v[3] })} />
            )}
            addLabel={(item) => `+ ${item.company}`}
            onAdd={() => patch({ experience: [...content.experience, { company: "", role: "", duration: "", description: "" }] })}
            onRemove={(i) => patch({ experience: content.experience.filter((_, j) => j !== i) })}
            onSet={(i, item) => patch({ experience: content.experience.map((e, j) => (j === i ? item : e)) })}
          />
          <ListEditor
            label="Projects"
            items={content.projects}
            render={(item, set) => (
              <RowBlock values={[item.name, item.description, item.tech.join(", ")]} onChange={(v) => set({ name: v[0], description: v[1], tech: v[2].split(",").map((s) => s.trim()).filter(Boolean) })} />
            )}
            addLabel={(item) => `+ ${item.name}`}
            onAdd={() => patch({ projects: [...content.projects, { name: "", description: "", tech: [] }] })}
            onRemove={(i) => patch({ projects: content.projects.filter((_, j) => j !== i) })}
            onSet={(i, item) => patch({ projects: content.projects.map((e, j) => (j === i ? item : e)) })}
          />

          {notify ? <p className="text-sm text-success">{notify}</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => void remove()} disabled={!draftId || busy}>
              Delete
            </Button>
            <Button className="flex-1" onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : draftId ? "Save Changes" : "Save Resume"}
            </Button>
          </div>
        </div>
      </div>
      <aside className="rounded-xl border border-border bg-surface p-6">
        <p className="text-xs tracking-wide text-muted uppercase">Live preview</p>
        <h2 className="font-display mt-3 text-2xl">{content.contact.name || "Your Name"}</h2>
        <p className="text-sm text-muted">
          {content.contact.email} · {content.contact.phone}
        </p>
        {content.summary ? <p className="mt-3 text-sm leading-relaxed text-muted">{content.summary}</p> : null}
        <PreviewBlock title="Education">
          {content.education.map((e) => `${e.institution} · ${e.degree} · ${e.year}`).join(" — ") || "—"}
        </PreviewBlock>
        <PreviewBlock title="Skills">{content.skills.join(", ") || "—"}</PreviewBlock>
        <PreviewBlock title="Experience">
          {content.experience.map((e) => `${e.role} @ ${e.company}`).join(" — ") || "—"}
        </PreviewBlock>
        <PreviewBlock title="Projects">
          {content.projects.map((p) => p.name).join(" — ") || "—"}
        </PreviewBlock>
        {draftId ? (
          <div className="mt-6">
            <Link to="/resume">
              <Button variant="ghost" className="w-full">
                Back to Analyzer
              </Button>
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function RowInputs({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {values.map((v, i) => (
        <input key={i} className="field" value={v} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
      ))}
    </div>
  );
}

function RowBlock({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <input key={i} className="field" value={v} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
      ))}
    </div>
  );
}

function ListEditor<T extends object>({
  label,
  items,
  render,
  onAdd,
  onRemove,
  onSet,
  addLabel,
}: {
  label: string;
  items: T[];
  render: (item: T, set: (item: T) => void) => ReactNode;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onSet: (index: number, item: T) => void;
  addLabel: (item: T) => string;
}) {
  return (
    <div className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-md bg-elevated p-3">
            {render(item, (next) => onSet(i, next))}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="mt-2 cursor-pointer text-xs text-danger hover:underline"
            >
              Remove {addLabel(item).replace("+ ", "")}
            </button>
          </div>
        ))}
        <button type="button" onClick={onAdd} className="cursor-pointer text-xs font-medium text-primary hover:text-fg">
          + Add {label.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

function PreviewBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="text-xs font-medium tracking-wide text-primary uppercase">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}