import { test, expect } from "@playwright/test";

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
