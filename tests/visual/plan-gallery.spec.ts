import { test, expect } from '@playwright/test';

// Static validation — no server required
test.describe('Gallery Spec — Structure Check', () => {
  test('spec file loads without error', async () => {
    // This test always passes — confirms spec parses and imports are valid
    expect(true).toBe(true);
  });
});

test.describe('Plan Gallery — Phase 22 (GALL-04 through GALL-07)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: authenticate and navigate to a plan with photos
    // Requires: live Expo web server + seeded plan data
  });

  test('GALL-04: photo grid renders in plan dashboard', async ({ page }) => {
    test.skip(true, 'TODO: requires live server + seeded plan with photos');
    await page.goto('/plans/[planId]');
    await expect(page.getByText('Photos')).toBeVisible();
    await expect(page.locator('[data-testid="photo-thumbnail"]').first()).toBeVisible();
  });

  test('GALL-04: FlatList refactor regression — existing plan content renders', async ({ page }) => {
    test.skip(true, 'TODO: requires live server + authenticated session');
    await page.goto('/plans/[planId]');
    await expect(page.getByText("Who's Going")).toBeVisible();
    await expect(page.getByText('Open Chat')).toBeVisible();
  });

  test('GALL-05: tapping thumbnail opens viewer modal', async ({ page }) => {
    test.skip(true, 'TODO: requires live server + seeded plan with photos');
    await page.goto('/plans/[planId]');
    await page.locator('[data-testid="photo-thumbnail"]').first().tap();
    await expect(page.locator('[data-testid="gallery-viewer-modal"]')).toBeVisible();
  });

  test('GALL-06: uploader name visible in viewer overlay bar', async ({ page }) => {
    test.skip(true, 'TODO: requires live server + seeded plan with photos');
    await page.goto('/plans/[planId]');
    await page.locator('[data-testid="photo-thumbnail"]').first().tap();
    await expect(page.locator('[data-testid="gallery-viewer-uploader-name"]')).toBeVisible();
  });

  test('GALL-07: delete button visible only on own photos', async ({ page }) => {
    test.skip(true, 'TODO: requires live server + authenticated as photo uploader');
    await page.goto('/plans/[planId]');
    await page.locator('[data-testid="photo-thumbnail"]').first().tap();
    await expect(page.getByAccessibilityLabel('Delete photo')).toBeVisible();
  });
});
