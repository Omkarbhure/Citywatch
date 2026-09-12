import { test, expect } from '@playwright/test';

test.describe('E2E: Citizen Report Flow', () => {
  const timestamp = Date.now();
  const citizenEmail = `citizen_${timestamp}@citywatch.org`;
  const incidentTitle = `Pothole on 100ft Road ${timestamp}`;

  test('register -> report an incident -> confirm it appears in feed and map', async ({ page }) => {
    // 1. Register a new citizen account
    await page.goto('/signup');
    await page.fill('input[type="text"]', 'E2E Test Citizen');
    await page.fill('input[type="email"]', citizenEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();

    // 2. Navigate to report incident
    await page.click('text=Report New Incident');
    await expect(page).toHaveURL(/.*report/);

    // Fill incident report form
    await page.fill('input[placeholder*="Broken streetlight"]', incidentTitle);
    await page.selectOption('select', 'pothole');
    await page.fill('textarea[placeholder*="Describe the issue"]', 'Large pothole blocking the left lane near metro pillar.');
    await page.fill('input[placeholder*="123 Main St"]', '100ft Road, Indiranagar');

    // Click to acquire location
    await page.click('button:has-text("Use My Current Location")');
    await expect(page.locator('text=Location acquired')).toBeVisible({ timeout: 10000 });

    // Submit report
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Incident reported successfully')).toBeVisible();

    // 3. Navigate to feed and confirm incident appears
    await page.goto('/incidents');
    await expect(page.locator(`text=${incidentTitle}`)).toBeVisible({ timeout: 10000 });

    // 4. Navigate to map and confirm marker / title appears
    await page.goto('/map');
    await expect(page.locator(`text=${incidentTitle}`)).toBeVisible({ timeout: 10000 });
  });
});
