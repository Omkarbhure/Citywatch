import { test, expect } from '@playwright/test';

test.describe('E2E: Analytics & SLA Metrics Access', () => {
  const timestamp = Date.now();

  test('unauthenticated visitor navigating to /authority/analytics is redirected to /login', async ({ page }) => {
    await page.goto('/authority/analytics');
    await expect(page).toHaveURL(/.*login/);
  });
});
