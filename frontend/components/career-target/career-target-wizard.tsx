"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import { getTargetPreference, saveTargetPreference } from "@/app/actions/target";
import { COMPANIES, COMPANY_TYPES } from "@/lib/targets";
import { RoleStep } from "./role-step";
import { TypeStep } from "./type-step";
import { CompanyStep } from "./company-step";

const stepLabels = ["Role", "Company type", "Companies"];

export function CareerTargetWizard() {
  const [step, setStep] = useState(0);
  const [roleId, setRoleId] = useState("");
  const [companyTypes, setCompanyTypes] = useState<string[]>([]);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // The JWT lives in localStorage, so the client asks the server loader to
  // prefill the wizard after mount.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    void getTargetPreference(token).then((saved) => {
      if (!saved) return;
      setRoleId(saved.roleId);
      setCompanyTypes(saved.companyTypes);
      setCompanyIds(saved.companyIds);
    });
  }, []);

  const canContinue = step === 0 ? Boolean(roleId) : step === 1 ? companyTypes.length > 0 : true;

  function toggleType(id: string) {
    const next = companyTypes.includes(id)
      ? companyTypes.filter((typeId) => typeId !== id)
      : [...companyTypes, id];
    setCompanyTypes(next);
    // Drop companies that are no longer shown after the type change.
    setCompanyIds((ids) =>
      ids.filter((companyId) => {
        const company = COMPANIES.find((item) => item.id === companyId);
        return company ? next.length === 0 || next.includes(company.type) : false;
      })
    );
  }

  function toggleCompany(id: string) {
    setCompanyIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  async function finish() {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveTargetPreference(
        { roleId, companyTypes, companyIds },
        getAccessToken() ?? ""
      );
      setMessage(result.ok ? { tone: "success", text: result.message } : { tone: "error", text: result.message });
    } catch {
      setMessage({ tone: "error", text: "We couldn't save that just now. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <ol aria-label="Your progress" className="mb-8 flex gap-2 sm:gap-4">
        {stepLabels.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={index === step ? "step" : undefined}>
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                index < step
                  ? "bg-indigo-600 text-white"
                  : index === step
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-slate-100 text-muted"
              }`}
            >
              {index < step ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className={`hidden text-sm font-medium sm:inline ${index === step ? "text-indigo-700" : "text-muted"}`}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 ? <RoleStep selectedRoleId={roleId} onSelect={setRoleId} /> : null}
      {step === 1 ? (
        <TypeStep
          selectedTypes={companyTypes}
          onToggle={toggleType}
          onShowAll={() => setCompanyTypes(COMPANY_TYPES.map((type) => type.id))}
        />
      ) : null}
      {step === 2 ? (
        <CompanyStep companyTypes={companyTypes} selectedIds={companyIds} onToggle={toggleCompany} />
      ) : null}

      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : null}
          {!canContinue ? (
            <p className="mt-2 text-xs text-muted">
              {step === 0 ? "Choose a role to continue." : "Choose a company type, or select all."}
            </p>
          ) : null}
        </div>

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canContinue}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void finish()}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Finish"}
          </button>
        )}
      </div>
    </div>
  );
}
