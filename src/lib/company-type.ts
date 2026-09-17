// WHY a deterministic classifier (no LLM): the question prompt needs a style
// bucket (service/product/startup) to know how deep to go. Calling the LLM for
// classification per question round would cost tokens and add latency for a
// thing keyword heuristics get right ~95% of the time. Unknown companies fall
// back to a neutral, balanced style — never a wrong aggressive assumption.

export type CompanyType = "service" | "product" | "startup" | "unknown";

// WHY keyword sets over a hardcoded company wiki: RULES.md says editable text
// input with no hardcoded wiki. These are type *heuristics* (service/product/
// startup), not a company database — they let common student targets (Infosys,
// Google, early-stage startups) pick up an appropriate style without shipping a
// fragile list of thousands of companies.
const SERVICE_KEYWORDS = [
  "infosys", "tcs", "wipro", "accenture", "cognizant", "capgemini", "lti",
  "tech mahindra", "hcl", "infotech", "services", "consultancy", "consulting",
  "cognizant", "dell", "ibm", "cgi", "genpact", "mphasis",
];
const PRODUCT_KEYWORDS = [
  "google", "amazon", "microsoft", "meta", "facebook", "apple", "netflix",
  "flipkart", "paytm", "swiggy", "zomato", "ola", "uber", "linkedin", "twitter",
  "salesforce", "oracle", "adobe", "intuit", "activision", "nvidia", "amd",
];

export function classifyCompany(name: string): CompanyType {
  const n = name.toLowerCase().trim();

  // Service companies are the highest-signal bucket: staff-augmentation and
  // consultancy shops are named for a single brand (Infosys, TCS...) that we
  // can enumerate at small risk — the set is small and stable over years.
  if (SERVICE_KEYWORDS.some((k) => n.includes(k))) return "service";

  // Product companies above are the FAANG/unicorn tier; a plain ".com" or
  // "Technologies"/"Labs" tail leans product-shaped too.
  if (PRODUCT_KEYWORDS.some((k) => n.includes(k))) return "product";
  if (/\.com$/.test(n)) return "product";
  if (/(technologies|systems|labs|software|apps?|tech)$/.test(n)) return "product";

  // Startups: solo-founder naming patterns (a single vivid word with no suffix
  // the big firms share) are the strongest tell. Matches "Nova", "Deployly",
  // "Astra" without inventing a catalog.
  if (/(\.ai|\.io)$/.test(n)) return "startup";
  if (/^[a-z]{3,12}$/.test(n) && !SERVICE_KEYWORDS.includes(n)) return "startup";

  return "unknown";
}

// WHY a neutral fallback matters: a company the heuristic doesn't recognise
// must still get a sane interview. "unknown" returns the balanced guidance for
// the given mode — the interview stays usable, just not specially styled.
export const COMPANY_TYPE_GUIDANCE: Record<CompanyType, string> = {
  service:
    "This is a SERVICE / consultancy-style company. Emphasize fundamentals (core language, data structures basics, networking, SQL), clear communication, and how the candidate handles client-facing scenarios and process. Less emphasis on deep system design.",
  product:
    "This is a PRODUCT company with demanding technical interviews. Emphasize DSA depth, time/space complexity reasoning, system-design thinking at the appropriate seniority, and product impact stories with metrics.",
  startup:
    "This is a STARTUP. Emphasize versatility, ownership and impact stories ('I built and shipped X'), cross-stack awareness, and comfort with ambiguity and fast iteration. Smaller focus on formal DSA trivia, more on shipping and judgment.",
  unknown:
    "Company type is unknown — keep a balanced mix of fundamentals, DSA tied to their projects, and behavioral/ownership questions appropriate to the chosen mode.",
};

export function guidanceForCompany(name: string | null | undefined): CompanyType {
  if (!name) return "unknown";
  return classifyCompany(name);
}

// WHY role → mode suggestion is a dumb keyword check (no LLM): a target role
// like "Frontend Developer" leans technical, a role like "Business Analyst"
// leans behavioral. This is purely a *suggestion* the student can override — a
// heuristic is plenty and costs nothing, matching scope's "suggestion only".
export function suggestModeForRole(role: string | null | undefined): "behavioral" | "technical" {
  const r = (role ?? "").toLowerCase();
  const technicalHints = [
    "developer", "engineer", "engineering", "sde", "backend", "frontend",
    "full-stack", "fullstack", "data", "machine learning", "ml", "devops",
    "qa", "tester", "mobile", "android", "ios", "cloud", "sre", "security",
  ];
  if (technicalHints.some((h) => r.includes(h))) return "technical";
  return "behavioral";
}
