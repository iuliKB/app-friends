import { test, expect, Page } from "@playwright/test";

const TEST_EMAIL = "tester2@gmail.com";
const TEST_PASSWORD = "tester2tester";

async function login(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const inputs = page.locator("input");
  await inputs.nth(0).fill(TEST_EMAIL);
  await inputs.nth(1).fill(TEST_PASSWORD);
  await page.getByText("Sign In").click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState("networkidle");
}

async function navigateToSquad(page: Page) {
  await page.goto("/squad");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
}

test.describe("Squad Dashboard — DASH-01, DASH-02, DASH-03, DASH-04", () => {
  test("DASH-01: Squad tab renders single scrollable dashboard", async ({ page }) => {
    await login(page);
    await navigateToSquad(page);
    await expect(page).toHaveScreenshot("squad-dashboard.png");
  });

  test("DASH-02: Feature cards show glanceable summaries", async ({ page }) => {
    await login(page);
    await navigateToSquad(page);
    await expect(page.getByText(/unsettled|owed|owe/i).first()).toBeVisible();
    await expect(page).toHaveScreenshot("squad-cards-summary.png");
  });

  test("DASH-03: Dashboard cards visible after entrance animation settles", async ({ page }) => {
    await login(page);
    await navigateToSquad(page);
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("squad-cards-animated.png");
  });

  test("DASH-04: StreakCard is present and shows streak data", async ({ page }) => {
    await login(page);
    await navigateToSquad(page);
    await expect(page.getByText(/streak/i)).toBeVisible();
    await expect(page).toHaveScreenshot("squad-streak-card.png");
  });
});
