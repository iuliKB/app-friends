import { test, expect } from '@playwright/test';

test.describe('Birthday Wish List', () => {
  test('wish list section visible in profile edit', async ({ page }) => {
    // RED stub — will pass once Plan 11-04 wires wish list into edit.tsx
    test.skip(true, 'Stub — wish list not yet implemented');
    await expect(page).toHaveTitle(/Campfire/);
  });

  test('friend birthday page shows wish list items', async ({ page }) => {
    // RED stub — will pass once Plan 11-05 builds FriendBirthdayPage
    test.skip(true, 'Stub — FriendBirthdayPage not yet implemented');
    await expect(page).toHaveTitle(/Campfire/);
  });

  test('claim toggle visible to friends', async ({ page }) => {
    // RED stub — claim UX
    test.skip(true, 'Stub — claim feature not yet implemented');
    await expect(page).toHaveTitle(/Campfire/);
  });
});
