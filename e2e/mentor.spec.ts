import { test, expect } from "@playwright/test";

const HAS_AI = Boolean(process.env.OPENROUTER_API_KEY);

test.skip(!HAS_AI, "AI provider key not configured — skipping AI-dependent flow");

test("user can chat with the AI career mentor", async ({ page }) => {
  test.setTimeout(150_000);

  await page.goto("/login");
  await page.getByLabel("Email").fill("student@careerpilot.dev");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.goto("/mentor");
  await expect(page.getByRole("heading", { name: "Career Mentor" })).toBeVisible();
  await expect(page.getByText(/I'm your career mentor/i)).toBeVisible();

  const textarea = page.getByPlaceholder("Ask your mentor anything…");
  await textarea.fill("What should I improve first?");
  await textarea.press("Enter");

  await expect(page.getByText(/thinking/i)).toBeVisible();
  // Wait for the AI reply (the "Thinking…" indicator disappears).
  await expect(page.getByText(/thinking/i)).toBeHidden({ timeout: 90_000 });

  // Greeting + user message + AI reply = 3 bubbles, and the reply must be a
  // real answer, not the offline fallback message.
  const bubbles = page.locator("div.rounded-2xl");
  await expect(bubbles).toHaveCount(3);
  await expect(bubbles.last()).not.toContainText("couldn't reach");
});
