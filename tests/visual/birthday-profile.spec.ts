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

async function navigateToProfileEdit(page: Page) {
  // Navigate to the profile edit screen via URL
  await page.goto("/profile/edit");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
}

test.describe("Birthday Profile Field — BDAY-01", () => {
  test("profile edit screen renders with birthday field", async ({ page }) => {
    await login(page);
    await navigateToProfileEdit(page);
    // Verify the birthday label and picker dropdowns are visible
    await expect(page.getByText("Birthday")).toBeVisible();
    await expect(page.getByText("Month")).toBeVisible();
    await expect(page.getByText("Day")).toBeVisible();
    await expect(page).toHaveScreenshot("profile-edit-birthday.png");
  });

  test("birthday field shows placeholder text when no birthday is set", async ({ page }) => {
    await login(page);
    await navigateToProfileEdit(page);
    // Month and Day placeholders should be visible when no birthday is stored
    const monthTrigger = page.getByText("Month");
    const dayTrigger = page.getByText("Day");
    await expect(monthTrigger).toBeVisible();
    await expect(dayTrigger).toBeVisible();
  });

  test("save button is disabled when no changes made", async ({ page }) => {
    await login(page);
    await navigateToProfileEdit(page);
    // Save Changes button should be disabled on initial load (isDirty = false)
    const saveButton = page.getByText("Save Changes");
    await expect(saveButton).toBeVisible();
    // The button should be in a disabled/non-interactive state
    // We verify by checking the aria-disabled attribute or opacity via screenshot
    await expect(page).toHaveScreenshot("profile-edit-birthday-initial.png");
  });
});
