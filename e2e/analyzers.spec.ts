import { test, expect } from "@playwright/test";

const HAS_AI = Boolean(process.env.OPENROUTER_API_KEY);

test.skip(!HAS_AI, "AI provider key not configured — skipping AI-dependent flow");

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("student@careerpilot.dev");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test("GitHub analyzer renders and gracefully errors on an unknown user", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);

  await page.goto("/github");
  await expect(page.getByRole("heading", { name: "GitHub Analyzer" })).toBeVisible();
  await expect(page.getByText("Analyze a GitHub profile")).toBeVisible();

  await page.getByLabel("GitHub username").fill("this-user-does-not-exist-9f3a2c");
  await page.getByRole("button", { name: "Analyze" }).click();

  // The GitHub API 404s for an unknown user; the app must show a readable
  // error (not crash) and re-enable the form.
  await expect(
    page.getByText(/GitHub user not found|GitHub API rate limit|GitHub API error/i),
  ).toBeVisible({ timeout: 60_000 });

  const button = page.getByRole("button", { name: "Analyze" });
  await expect(button).toBeEnabled();
});

test("LinkedIn analyzer page renders its analysis form", async ({ page }) => {
  await login(page);
  await page.goto("/linkedin");
  await expect(page.getByRole("heading", { name: "LinkedIn Analyzer" })).toBeVisible();
  await expect(page.getByText("Analyze profile")).toBeVisible();
  await expect(page.getByPlaceholder(/Software Engineering Intern at X/)).toBeVisible();
});

test("user can analyze a LinkedIn profile with AI", async ({ page }) => {
  test.setTimeout(180_000);
  await login(page);
  await page.goto("/linkedin");

  const profile = [
    "Full-Stack Software Engineer Intern at TechCorp",
    "",
    "About: CS student building web apps with React, Node.js and PostgreSQL. Passionate about clean architecture and developer tools.",
    "",
    "Experience",
    "Software Engineering Intern, TechCorp (May 2025 - Present)",
    "- Built a React dashboard serving 30k monthly users, cutting load times by 45%",
    "- Designed REST APIs in Node.js with Redis caching, reducing DB calls by 60%",
    "- Led a team of 3 on a hackathon project that shipped to production",
    "",
    "Education",
    "B.Tech in Computer Science, State University (2023 - 2027), CGPA 8.7",
    "",
    "Skills",
    "JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS, Git",
    "",
    "Certifications",
    "AWS Certified Cloud Practitioner (2025)",
  ].join("\n");

  await page.getByLabel("Profile text").fill(profile);
  await page.getByRole("button", { name: "Analyze profile" }).click();

  await expect(page.getByText("Strengths")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Weaknesses")).toBeVisible();
  await expect(page.getByText("Recommendations")).toBeVisible();
  await expect(page.getByText("Past analyses")).toBeVisible();
});

test("Projects page renders and opens the add-project form", async ({ page }) => {
  await login(page);
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByPlaceholder("e.g. CareerPilot")).toBeVisible();
  await expect(page.getByPlaceholder("https://github.com/...")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save project" })).toBeVisible();
});

test("Communication analyzer page renders its recording form", async ({ page }) => {
  await login(page);
  await page.goto("/communication");
  await expect(page.getByRole("heading", { name: "Communication Analysis" })).toBeVisible();
  await expect(page.getByPlaceholder("Paste what you said when answering out loud…")).toBeVisible();
  await expect(page.getByRole("button", { name: "Analyze communication" })).toBeVisible();
});
