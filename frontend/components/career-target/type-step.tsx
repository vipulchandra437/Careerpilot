"use client";

import { Check } from "lucide-react";
import { COMPANY_TYPES } from "@/lib/targets";

export function TypeStep({
  selectedTypes,
  onToggle,
  onShowAll,
}: {
  selectedTypes: string[];
  onToggle: (id: string) => void;
  onShowAll: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">What kind of company interests you?</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose as many as you like. You can also choose all if you are still exploring.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {COMPANY_TYPES.map((type) => {
          const selected = selectedTypes.includes(type.id);
          return (
            <button
              key={type.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(type.id)}
              className={`flex items-start justify-between gap-3 rounded-2xl border p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                selected
                  ? "border-indigo-400 bg-indigo-50/70"
                  : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
              }`}
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">{type.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-500">{type.desc}</span>
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

      <button
        type="button"
        aria-pressed={selectedTypes.length === COMPANY_TYPES.length}
        onClick={onShowAll}
        className="mt-4 text-sm font-semibold text-indigo-600 underline decoration-indigo-200 underline-offset-4 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      >
        Show me all company types
      </button>
    </div>
  );
}
