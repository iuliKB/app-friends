import { test, expect } from '@playwright/test';

test.describe('Birthday Group Chat', () => {
  test('friend birthday page shows friend picker and plan birthday button', async ({ page }) => {
    // RED stub — will pass once Plan 11-05 builds group creation flow
    test.skip(true, 'Stub — FriendBirthdayPage not yet implemented');
    await expect(page).toHaveTitle(/Campfire/);
  });

  test('create birthday group navigates to group chat room', async ({ page }) => {
    // RED stub — group chat creation
    test.skip(true, 'Stub — group chat creation not yet implemented');
    await expect(page).toHaveTitle(/Campfire/);
  });
});
