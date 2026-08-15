import { test, expect } from "@playwright/test";

test("user can register and land on career goal", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.local`;
  await page.goto("/register");

  await page.getByLabel("Full name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");

  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/career-goal/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Career Goal" })).toBeVisible();
});

test("login redirects to dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("student@careerpilot.dev");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByText("Dashboard", { exact: true }).first()).toBeVisible();
});

test("unauthenticated user is redirected away from protected pages", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
});
