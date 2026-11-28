"use client";

import { useMemo, useState } from "react";
import { ROLES } from "@/lib/targets";

export function RoleStep({
  selectedRoleId,
  onSelect,
}: {
  selectedRoleId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const roles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROLES;
    return ROLES.filter((role) =>
      [role.title, role.desc, ...role.tags].some((value) => value.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">What role are you aiming for?</h2>
      <p className="mt-1 text-sm text-muted">Pick one. It is fine to change your mind later.</p>

      <label htmlFor="role-search" className="mt-6 block text-sm font-medium text-slate-700">
        Search roles
      </label>
      <input
        id="role-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Try a word like data or design"
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-muted focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <p aria-live="polite" className="mt-3 text-xs text-muted">
        {roles.length === ROLES.length ? `${ROLES.length} roles available` : `${roles.length} roles found`}
      </p>

      {roles.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No roles matched that word.</p>
          <p className="mt-1 text-sm text-muted">Try a shorter word, like web or data.</p>
        </div>
      ) : (
        <div className="mt-4 max-h-[22rem] space-y-2 overflow-y-auto pr-1">
          {roles.map((role) => {
            const selected = role.id === selectedRoleId;
            return (
              <button
                key={role.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(role.id)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                  selected
                    ? "border-indigo-400 bg-indigo-50/70"
                    : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-indigo-500 bg-indigo-500" : "border-slate-300"
                  }`}
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{role.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted">{role.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
