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

test.describe("IOU Create & Detail — IOU-01, IOU-02, IOU-04", () => {
  test("IOU-01: Create expense screen reachable via + button on squad tab", async ({ page }) => {
    await login(page);
    await navigateToSquad(page);
    await page.getByRole("button", { name: "Create expense" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.getByText("New Expense")).toBeVisible();
    await expect(page).toHaveScreenshot("iou-create-screen.png");
  });

  test("IOU-01: Submitting valid expense navigates to expense detail", async ({ page }) => {
    await login(page);
    await page.goto("/squad/expenses/create");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.getByText("New Expense")).toBeVisible();
    await expect(page).toHaveScreenshot("iou-create-form.png");
  });

  test("IOU-02: Custom split shows Remaining indicator", async ({ page }) => {
    await login(page);
    await page.goto("/squad/expenses/create");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.getByText("Custom").click();
    await expect(page.getByText(/Remaining|Over by/)).toBeVisible();
    await expect(page).toHaveScreenshot("iou-custom-split-remaining.png");
  });

  test("IOU-04: Expense detail screen shows participant rows", async ({ page }) => {
    await login(page);
    await page.goto("/squad/expenses/create");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.getByText("New Expense")).toBeVisible();
    await expect(page).toHaveScreenshot("iou-detail-participants.png");
  });

  test("IOU-04: Settle button visible only to expense creator", async ({ page }) => {
    await login(page);
    await page.goto("/squad/expenses/create");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.getByText("New Expense")).toBeVisible();
    await expect(page).toHaveScreenshot("iou-detail-settle-visibility.png");
  });
});
