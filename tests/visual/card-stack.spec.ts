import { test, expect, Page } from "@playwright/test";

// Visual regression tests for Phase 3: Card Stack View
// Run via: npx playwright test tests/visual/card-stack.spec.ts
// Update baselines: npx playwright test tests/visual/card-stack.spec.ts --update-snapshots

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

async function switchToCardsView(page: Page) {
  // Click the "Cards" option in RadarViewToggle
  const cardsButton = page.getByText("Cards");
  if (await cardsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cardsButton.click();
    await page.waitForTimeout(400); // allow crossfade animation to complete
  }
}

test.describe("Card Stack View", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);
    await page.waitForLoadState("networkidle");
  });

  // CARD-01: Card deck renders friend details (avatar, name, mood, context tag, last-active time)
  test("cards view — deck renders friend card details", async ({ page }) => {
    await switchToCardsView(page);
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("card-stack-deck.png");
  });

  // CARD-03: Skip button visible and triggers deck advance
  test("cards view — skip button is visible and tappable", async ({ page }) => {
    await switchToCardsView(page);
    await page.waitForTimeout(500);
    const skipButton = page.getByText("Skip");
    await expect(skipButton).toBeVisible();
    await skipButton.click();
    // After skip, deck should still be visible (loop or next card)
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot("card-stack-after-skip.png");
  });

  // CARD-05: Counter above deck is visible and updates
  test("cards view — counter label is visible", async ({ page }) => {
    await switchToCardsView(page);
    await page.waitForTimeout(500);
    // Counter text matches "N more free" or "Just you right now"
    const counter = page.getByText(/more free|Just you right now/);
    await expect(counter).toBeVisible();
  });
});
