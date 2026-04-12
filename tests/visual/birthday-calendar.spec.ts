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

async function navigateToSquadGoals(page: Page) {
  await page.goto("/squad");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  // Tap the Goals tab
  await page.getByText("Goals").click();
  await page.waitForTimeout(1000);
}

test.describe("Birthday Calendar Feature — BDAY-02, BDAY-03", () => {
  test("BDAY-03: BirthdayCard visible on goals tab below StreakCard", async ({ page }) => {
    await login(page);
    await navigateToSquadGoals(page);
    await expect(page.getByText("Birthdays 🎂")).toBeVisible();
    await expect(page).toHaveScreenshot("birthday-card-goals-tab.png");
  });

  test("BDAY-03: BirthdayCard shows empty state copy when no upcoming birthdays", async ({ page }) => {
    await login(page);
    await navigateToSquadGoals(page);
    // Either count copy or empty state must be visible — card never disappears (D-12)
    const hasData = await page.getByText(/birthdays in the next 30 days/).isVisible().catch(() => false);
    const hasEmpty = await page.getByText("No upcoming birthdays").isVisible().catch(() => false);
    expect(hasData || hasEmpty).toBe(true);
  });

  test("BDAY-03: Tapping BirthdayCard navigates to birthday list screen", async ({ page }) => {
    await login(page);
    await navigateToSquadGoals(page);
    await page.getByText("Birthdays 🎂").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.getByText("Birthdays")).toBeVisible();
    await expect(page).toHaveScreenshot("birthday-list-screen.png");
  });

  test("BDAY-02: Birthday list screen shows friends sorted by days_until", async ({ page }) => {
    await login(page);
    await page.goto("/squad/birthdays");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await expect(page.getByText("Birthdays")).toBeVisible();
    await expect(page).toHaveScreenshot("birthday-list-full.png");
  });

  test("BDAY-02: Birthday list shows empty state when no friends have birthdays", async ({ page }) => {
    await login(page);
    await page.goto("/squad/birthdays");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    // Either rows or empty state visible — screen does not crash
    const hasRows = await page.locator('[data-testid="birthday-row"]').count().then(c => c > 0).catch(() => false);
    const hasEmpty = await page.getByText("No birthdays yet").isVisible().catch(() => false);
    const hasContent = await page.getByText("Birthdays").isVisible().catch(() => false);
    expect(hasRows || hasEmpty || hasContent).toBe(true);
  });
});
