import { test, expect, Page } from "@playwright/test";

// Visual regression tests for Campfire design system consistency.
// Run via: npx playwright test
// Update baselines: npx playwright test --update-snapshots

const TEST_EMAIL = "tester2@gmail.com";
const TEST_PASSWORD = "tester2tester";

async function login(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Fill login form
  const inputs = page.locator("input");
  await inputs.nth(0).fill(TEST_EMAIL);
  await inputs.nth(1).fill(TEST_PASSWORD);

  // Submit
  await page.getByText("Sign In").click();

  // Wait for navigation to complete (tab bar should appear)
  await page.waitForTimeout(3000);
  await page.waitForLoadState("networkidle");
}

test.describe("Design System Visual Regression", () => {
  test("auth screen - login", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("auth-login.png");
  });

  test("auth screen - signup tab", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const signUpTab = page.getByText("Sign Up");
    if (await signUpTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signUpTab.click();
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot("auth-signup.png");
    }
  });

  test("home screen", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-screen.png");
  });

  test("explore screen", async ({ page }) => {
    await login(page);
    await page.getByText("Explore").click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("explore-screen.png");
  });

  test("chats screen", async ({ page }) => {
    await login(page);
    await page.getByText("Chats").click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("chats-screen.png");
  });

  test("friends screen", async ({ page }) => {
    await login(page);
    await page.getByText("Squad").click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("friends-screen.png");
  });

  test("profile screen", async ({ page }) => {
    await login(page);
    await page.getByText("Profile").click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("profile-screen.png");
  });
});
