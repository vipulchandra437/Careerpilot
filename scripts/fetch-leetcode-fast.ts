#!/usr/bin/env node
/**
 * Fast LeetCode fetcher — fetches problem LIST only (no individual details).
 * Generates seed data with basic descriptions, starter code, and example test cases.
 * Runs in ~30 seconds instead of 30+ minutes.
 *
 * Usage: npx tsx scripts/fetch-leetcode-fast.ts
 * Output: prisma/leetcode-seed.ts
 */

import fs from "fs";
import path from "path";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const PAGE = 100;
const DELAY_MS = 200;
const SEED_FILE = path.join(__dirname, "../prisma/leetcode-seed.ts");
const CACHE_FILE = path.join(__dirname, "../prisma/leetcode-problems.json");

const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Referer: "https://leetcode.com/problemset/all/",
  Origin: "https://leetcode.com",
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, body: any, retries = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
      if (res.status === 429) {
        const wait = (attempt + 1) * 5000;
        console.log(`  Rate limited, waiting ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      if (attempt < retries - 1) await sleep(1000 * (attempt + 1));
      else throw e;
    }
  }
}

async function fetchAllFreeProblems(): Promise<any[]> {
  const all: any[] = [];
  let skip = 0;
  while (true) {
    console.log(`Fetching problems (skip=${skip})...`);
    const data = await fetchWithRetry(LEETCODE_GRAPHQL, {
      query: `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
          total: totalNum
          questions: data {
            frontendQuestionId: questionFrontendId
            title
            titleSlug
            difficulty
            topicTags { name }
            paidOnly: isPaidOnly
            acRate
          }
        }
      }`,
      variables: { categorySlug: "algorithms", skip, limit: PAGE, filters: {} },
    });
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
        topics: (q.topicTags ?? []).map((t: any) => t.name),
        acRate: q.acRate,
      });
    }
    console.log(`  Got ${questions.length} (${all.length} free, total=${total})`);
    skip += PAGE;
    if (skip >= total) break;
    await sleep(DELAY_MS);
  }
  return all;
}

function buildSeedEntry(p: any) {
  const id = p.frontendQuestionId;
  const timeLimit = p.difficulty === "Easy" ? 2000 : p.difficulty === "Medium" ? 3000 : 4000;
  const fnName = "solution";
  const topicList = p.topics.join(", ");
  const description = `### ${id}. ${p.title}\n\nDifficulty: ${p.difficulty}\nTopics: ${topicList}\nAcceptance Rate: ${(p.acRate ?? 0).toFixed(1)}%\n\nPlease refer to [LeetCode](https://leetcode.com/problems/${p.slug}/) for the full problem description.`;

  return {
    title: `${id}. ${p.title}`,
    slug: p.slug,
    description,
    constraints: ["Follow the problem constraints on LeetCode."],
    examples: [{ input: "See LeetCode", output: "See LeetCode" }],
    difficulty: p.difficulty.toUpperCase(),
    topics: p.topics,
    companies: [],
    expectedComplexity: "See problem description",
    timeLimitMs: timeLimit,
    starterPython: `class Solution:\n    def ${fnName}(self, *args):\n        pass\n`,
    starterJs: `/**\n * @param {any} ...args\n * @return {any}\n */\nvar ${fnName} = function(...args) {\n    \n};\n`,
    testCases: [{ args: ["See LeetCode"], expected: "See LeetCode" }],
    hiddenTestCases: [{ args: [], expected: null }],
  };
}

async function main() {
  console.log("=== Fast LeetCode Fetcher ===\n");

  let problems: any[];
  if (fs.existsSync(CACHE_FILE)) {
    console.log("Using cached problem list...");
    problems = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    console.log(`Loaded ${problems.length} problems from cache.\n`);
  } else {
    console.log("Fetching problem list from LeetCode...\n");
    problems = await fetchAllFreeProblems();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(problems, null, 2));
    console.log(`\nSaved ${problems.length} problems to cache.\n`);
  }

  console.log("Generating seed file...");
  const entries = problems.map(buildSeedEntry);

  const easy = entries.filter((e) => e.difficulty === "EASY").length;
  const medium = entries.filter((e) => e.difficulty === "MEDIUM").length;
  const hard = entries.filter((e) => e.difficulty === "HARD").length;

  const seedContent = `// AUTO-GENERATED by scripts/fetch-leetcode-fast.ts — DO NOT EDIT
// Generated at: ${new Date().toISOString()}
// Total problems: ${entries.length} (Easy: ${easy}, Medium: ${medium}, Hard: ${hard})

export const LECODE_PROBLEMS = ${JSON.stringify(entries, null, 2)};
`;

  fs.writeFileSync(SEED_FILE, seedContent);
  console.log(`\nDone! Generated ${SEED_FILE}`);
  console.log(`  Total: ${entries.length} | Easy: ${easy} | Medium: ${medium} | Hard: ${hard}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
