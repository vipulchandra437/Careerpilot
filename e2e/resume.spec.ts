import { test, expect } from "@playwright/test";

const HAS_AI = Boolean(process.env.OPENROUTER_API_KEY);

test.skip(!HAS_AI, "AI provider key not configured — skipping AI-dependent flow");

test("user can upload a resume and get an AI analysis", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/login");
  await page.getByLabel("Email").fill("student@careerpilot.dev");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.goto("/resume");
  await expect(page.getByRole("heading", { name: "Resume Analyzer" })).toBeVisible();

  const resumeText = [
    "# Alex Carter",
    "",
    "Full-Stack Software Engineer",
    "",
    "## Experience",
    "",
    "### Senior Software Engineer, TechCorp (2021 - Present)",
    "- Built a React and Node.js platform serving 50k monthly users, improving load times by 40%",
    "- Led a team of 4 engineers delivering REST APIs with PostgreSQL and Redis",
    "",
    "### Software Engineer, StartupX (2019 - 2021)",
    "- Shipped a mobile-friendly dashboard used by 10k customers",
    "- Reduced CI build times from 12 minutes to 3 minutes with caching",
    "",
    "## Skills",
    "- TypeScript, React, Node.js, PostgreSQL, Docker, AWS, GraphQL, CI/CD",
    "",
    "## Education",
    "- B.Sc. Computer Science, State University (2015 - 2019)",
  ].join("\n");

  await page.setInputFiles('input[type="file"]', {
    name: "resume.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(resumeText),
  });

  await page.getByLabel("Target company (optional)").fill("Microsoft");
  await page.getByLabel("Target role (optional)").fill("Software Engineer");

  await page.getByRole("button", { name: "Analyze resume" }).click();
  await expect(page.getByRole("button", { name: /analyzing/i })).toBeVisible();

  // The results card only renders after the AI analysis is saved.
  await expect(page.getByText("Analysis results")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("ATS score")).toBeVisible();
  await expect(page.getByText("Overall", { exact: true })).toBeVisible();
});
