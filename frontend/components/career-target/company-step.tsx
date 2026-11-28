"use client";

import { Check } from "lucide-react";
import { COMPANIES, COMPANY_TYPES } from "@/lib/targets";

const typeTitle = (id: string) => COMPANY_TYPES.find((type) => type.id === id)?.title ?? id;

export function CompanyStep({
  companyTypes,
  selectedIds,
  onToggle,
}: {
  companyTypes: string[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const companies =
    companyTypes.length === 0
      ? COMPANIES
      : COMPANIES.filter((company) => companyTypes.includes(company.type));

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">Which companies interest you?</h2>
      <p className="mt-1 text-sm text-muted">
        Pick a few names to keep in mind. You can choose more than one.
      </p>
      <p aria-live="polite" className="mt-4 text-xs text-muted">
        {companies.length} companies to choose from
      </p>

      {companies.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-muted">
          No companies match those types yet. Go back and choose another type.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {companies.map((company) => {
            const selected = selectedIds.includes(company.id);
            return (
              <button
                key={company.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onToggle(company.id)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                  selected
                    ? "border-indigo-400 bg-indigo-50/70"
                    : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-semibold text-indigo-700"
                >
                  {company.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{company.name}</span>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {typeTitle(company.type)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {company.sector} · {company.location}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{company.note}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                    selected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 bg-white"
                  }`}
                >
                  {selected ? <Check className="h-4 w-4" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
