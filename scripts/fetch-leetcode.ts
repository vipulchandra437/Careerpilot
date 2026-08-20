#!/usr/bin/env npx tsx
/**
 * Fetch all free LeetCode algorithm problems and generate seed data.
 *
 * Usage:
 *   npx tsx scripts/fetch-leetcode.ts
 *
 * Output:
 *   prisma/leetcode-problems.json  (intermediate cache)
 *   prisma/leetcode-seed.ts        (generated seed fragment)
 */

import fs from "fs";
import path from "path";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const CONCURRENCY = 5;
const DELAY_MS = 250;
const CACHE_FILE = path.join(__dirname, "../prisma/leetcode-problems.json");
const SEED_FILE = path.join(__dirname, "../prisma/leetcode-seed.ts");

const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Referer: "https://leetcode.com/problemset/all/",
  Origin: "https://leetcode.com",
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, body: any, retries = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        const wait = (attempt + 1) * 5000;
        console.log(`  Rate limited, waiting ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e: any) {
      if (attempt < retries - 1) {
        await sleep(1000 * (attempt + 1));
      } else {
        throw e;
      }
    }
  }
}

interface LcProblem {
  title: string;
  slug: string;
  frontendQuestionId: number;
  difficulty: "Easy" | "Medium" | "Hard";
  topicTags: string[];
}

async function fetchProblemListPage(skip: number, limit: number): Promise<any> {
  return fetchWithRetry(LEETCODE_GRAPHQL, {
    query: `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
        total: totalNum
        questions: data {
          frontendQuestionId: questionFrontendId
          title
          titleSlug
          difficulty
          topicTags { name slug }
          paidOnly: isPaidOnly
          acRate
        }
      }
    }`,
      variables: {
        categorySlug: "algorithms",
        skip,
        limit,
        filters: {},
      },
  });
}

async function fetchAllFreeProblems(): Promise<LcProblem[]> {
  const all: LcProblem[] = [];
  const PAGE = 100;
  let skip = 0;

  while (true) {
    console.log(`Fetching problem list (skip=${skip})...`);
    const data = await fetchProblemListPage(skip, PAGE);
    const questions = data?.data?.problemsetQuestionList?.questions ?? [];
    const total = data?.data?.problemsetQuestionList?.total ?? 0;

    if (questions.length === 0) break;

    for (const q of questions) {
      if (q.paidOnly) continue;
      all.push({
        title: q.title,
        slug: q.titleSlug,
        frontendQuestionId: parseInt(q.frontendQuestionId, 10),
        difficulty: q.difficulty,
        topicTags: (q.topicTags ?? []).map((t: any) => t.name),
      });
    }

    console.log(`  Got ${questions.length} questions (${all.length} free so far, total=${total})`);
    skip += PAGE;
    if (skip >= total) break;
    await sleep(DELAY_MS);
  }

  return all;
}

interface ProblemDetail {
  title: string;
  slug: string;
  frontendQuestionId: number;
  difficulty: string;
  topicTags: string[];
  description: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  starterCode: { python: string; javascript: string };
}

function cleanHtml(html: string): string {
  return html
    .replace(/<pre>.*?<\/pre>/gs, (m) => m.replace(/<[^>]+>/g, ""))
    .replace(/<code>(.*?)<\/code>/gs, "`$1`")
    .replace(/<strong>(.*?)<\/strong>/gs, "**$1**")
    .replace(/<em>(.*?)<\/em>/gs, "*$1*")
    .replace(/<li>(.*?)<\/li>/gs, "- $1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractExamples(content: string): { input: string; output: string; explanation?: string }[] {
  const examples: { input: string; output: string; explanation?: string }[] = [];
  const exRegex = /Example\s+(\d+):\s*\n*\s*Input:(.*?)\s*Output:(.*?)(?:\s*Explanation:(.*?))?(?=Example\s+\d+:|$)/gs;
  let match;
  while ((match = exRegex.exec(content)) !== null) {
    const input = match[2].trim();
    const output = match[3].trim();
    const explanation = match[4]?.trim();
    if (input && output) {
      examples.push({ input, output, ...(explanation ? { explanation } : {}) });
    }
  }
  return examples;
}

function extractConstraints(content: string): string[] {
  const constraints: string[] = [];
  const section = content.split(/Constraints?:/i)?.[1];
  if (!section) return constraints;
  const lines = section.split("\n").slice(0, 10);
  for (const line of lines) {
    const trimmed = line.replace(/^[-•*]\s*/, "").trim();
    if (trimmed && trimmed.length < 200 && !trimmed.match(/^(Example|Related|Tags)/i)) {
      constraints.push(trimmed);
    }
  }
  return constraints;
}

function generateStarterCode(title: string, description: string): { python: string; javascript: string } {
  const fnName = "solution";
  const python = `def ${fnName}():\n    # Implement ${title}\n    pass\n`;
  const javascript = `function ${fnName}() {\n  // Implement ${title}\n}\n`;
  return { python, javascript };
}

async function fetchProblemDetail(slug: string): Promise<Partial<ProblemDetail> | null> {
  try {
    const data = await fetchWithRetry(LEETCODE_GRAPHQL, {
      query: `query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          title
          titleSlug
          questionId
          questionFrontendId
          content
          constraints
          sampleTestCase
          metaOnly
          topicTags { name slug }
          codeSnippets { lang langSlug code }
        }
      }`,
      variables: { titleSlug: slug },
    });

    const q = data?.data?.question;
    if (!q) return null;

    const content = cleanHtml(q.content || "");
    const examples = extractExamples(content);
    const constraints = extractConstraints(content);

    const snippets: Record<string, string> = {};
    for (const s of q.codeSnippets ?? []) {
      if (s.langSlug === "python3") snippets.python = s.code;
      if (s.langSlug === "javascript") snippets.javascript = s.code;
    }

    return {
      description: content.slice(0, 5000),
      constraints,
      examples,
      starterCode: {
        python: snippets.python ?? generateStarterCode(q.title, content).python,
        javascript: snippets.javascript ?? generateStarterCode(q.title, content).javascript,
      },
      topicTags: (q.topicTags ?? []).map((t: any) => t.name),
    };
  } catch (e: any) {
    console.error(`  Failed to fetch ${slug}: ${e.message}`);
    return null;
  }
}

function generateTestCases(examples: { input: string; output: string }[]): { args: any[]; expected: any }[] {
  return examples.slice(0, 3).map((ex) => ({
    args: [ex.input],
    expected: ex.output,
  }));
}

function generateHiddenTestCases(): { args: any[]; expected: any }[] {
  return [{ args: [], expected: null }];
}

function buildSeedEntry(p: ProblemDetail) {
  const timeLimit =
    p.difficulty === "Easy" ? 2000 : p.difficulty === "Medium" ? 3000 : 4000;

  return {
    title: p.title,
    slug: p.slug,
    description: p.description || `Solve the ${p.title} problem.`,
    constraints: p.constraints.length > 0 ? p.constraints : ["No special constraints."],
    examples:
      p.examples.length > 0
        ? p.examples
        : [{ input: "N/A", output: "N/A" }],
    difficulty: p.difficulty.toUpperCase() as string,
    topics: p.topicTags,
    companies: [] as string[],
    expectedComplexity: "See problem description",
    timeLimitMs: timeLimit,
    starterPython: p.starterCode.python,
    starterJs: p.starterCode.javascript,
    testCases: generateTestCases(p.examples),
    hiddenTestCases: generateHiddenTestCases(),
  };
}

async function main() {
  console.log("=== LeetCode Problem Fetcher ===\n");

  let problems: LcProblem[];

  if (fs.existsSync(CACHE_FILE)) {
    console.log("Loading cached problem list...");
    problems = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    console.log(`Loaded ${problems.length} problems from cache.\n`);
  } else {
    console.log("Fetching problem list from LeetCode...\n");
    problems = await fetchAllFreeProblems();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(problems, null, 2));
    console.log(`\nSaved ${problems.length} problems to cache.\n`);
  }

  const detailCacheFile = path.join(__dirname, "../prisma/leetcode-details-cache.json");
  let detailCache: Record<string, Partial<ProblemDetail>> = {};
  if (fs.existsSync(detailCacheFile)) {
    detailCache = JSON.parse(fs.readFileSync(detailCacheFile, "utf-8"));
    console.log(`Loaded ${Object.keys(detailCache).length} cached details.\n`);
  }

  const toFetch = problems.filter((p) => !detailCache[p.slug]);
  console.log(`Need to fetch details for ${toFetch.length} problems.\n`);

  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const pct = ((i / toFetch.length) * 100).toFixed(1);
    console.log(`[${pct}%] Fetching batch ${Math.floor(i / CONCURRENCY) + 1} (${batch.length} problems)...`);

    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const detail = await fetchProblemDetail(p.slug);
        return { slug: p.slug, detail };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.detail) {
        detailCache[r.value.slug] = r.value.detail;
      }
    }

    if (i % 500 === 0 && i > 0) {
      fs.writeFileSync(detailCacheFile, JSON.stringify(detailCache));
      console.log(`  Saved progress (${Object.keys(detailCache).length} cached)`);
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(detailCacheFile, JSON.stringify(detailCache));
  console.log(`\nFetched ${Object.keys(detailCache).length} problem details.\n`);

  console.log("Generating seed file...");
  const entries: any[] = [];
  for (const p of problems) {
    const detail = detailCache[p.slug] ?? {};
    const entry = buildSeedEntry({
      title: p.title,
      slug: p.slug,
      frontendQuestionId: p.frontendQuestionId,
      difficulty: p.difficulty,
      topicTags: detail.topicTags ?? [],
      description: detail.description,
      constraints: detail.constraints ?? [],
      examples: detail.examples ?? [],
      starterCode: detail.starterCode ?? generateStarterCode(p.title, ""),
    });
    entries.push(entry);
  }

  const seedContent = `// AUTO-GENERATED by scripts/fetch-leetcode.ts — DO NOT EDIT
// Generated at: ${new Date().toISOString()}
// Total problems: ${entries.length}

export const LECODE_PROBLEMS = ${JSON.stringify(entries, null, 2)};
`;

  fs.writeFileSync(SEED_FILE, seedContent);
  console.log(`\nDone! Generated ${SEED_FILE} with ${entries.length} problems.`);

  const easy = entries.filter((e) => e.difficulty === "Easy").length;
  const medium = entries.filter((e) => e.difficulty === "Medium").length;
  const hard = entries.filter((e) => e.difficulty === "Hard").length;
  console.log(`  Easy: ${easy}, Medium: ${medium}, Hard: ${hard}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
