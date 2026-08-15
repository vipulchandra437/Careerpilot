import { test, expect } from "@playwright/test";

const HAS_AI = Boolean(process.env.OPENROUTER_API_KEY);

test.skip(!HAS_AI, "AI provider key not configured — skipping AI-dependent flow");

test("user can run a mock interview session end to end", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/login");
  await page.getByLabel("Email").fill("student@careerpilot.dev");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.goto("/interview");
  await expect(page.getByRole("heading", { name: "Mock Interview" })).toBeVisible();

  // Start a new session.
  await page.getByRole("button", { name: /start/i }).first().click();

  // First question is asked by the AI mentor.
  await expect(page.getByText(/question/i).first()).toBeVisible({ timeout: 60_000 });

  const textarea = page.locator("textarea").first();
  await expect(textarea).toBeVisible();
  await textarea.fill("I have strong algorithmic skills and experience building full-stack applications.");
  await page.getByRole("button", { name: /submit answer|answer/i }).click();

  // Evaluation feedback appears.
  await expect(page.getByText(/evaluation|feedback|score/i).first()).toBeVisible({ timeout: 90_000 });
});
