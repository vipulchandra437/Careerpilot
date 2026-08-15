import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("student@careerpilot.dev");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

test("coding page loads the first problem and runs starter code", async ({ page }) => {
  await page.goto("/coding");

  await expect(page.getByRole("heading", { name: "Coding Assessment" })).toBeVisible();
  await expect(page.getByText("Problems", { exact: true })).toBeVisible();

  // First problem is auto-loaded; its starter code is pre-filled.
  await page.getByRole("button", { name: "Run" }).click();

  // Execution round-trips to the runner and back — results card must appear.
  await expect(page.getByText(/tests passed/i)).toBeVisible({ timeout: 30_000 });
});

test("problems list renders seeded problems", async ({ page }) => {
  await page.goto("/coding");

  await expect(page.getByRole("heading", { name: "Coding Assessment" })).toBeVisible();
  await expect(page.locator("button").filter({ hasText: /EASY|MEDIUM|HARD/ }).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
});
