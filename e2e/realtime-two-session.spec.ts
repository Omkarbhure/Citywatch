import { test, expect } from '@playwright/test';

test.describe('E2E: Real-Time Two-Session Cross-Tab Synchronization', () => {
  const timestamp = Date.now();
  const citizenAEmail = `citizen_a_${timestamp}@example.com`;
  const citizenBEmail = `citizen_b_${timestamp}@example.com`;
  const incidentTitle = `Realtime Hazard ${timestamp}`;

  test('create incident in Context A -> appears live in Context B without reload', async ({ browser }) => {
    // 1. Create Context A and register Citizen A
    const contextA = await browser.newContext({
      geolocation: { latitude: 12.9716, longitude: 77.5946 },
      permissions: ['geolocation'],
    });
    const pageA = await contextA.newPage();

    await pageA.goto('/signup');
    await pageA.fill('input[type="text"]', 'Citizen A');
    await pageA.fill('input[type="email"]', citizenAEmail);
    await pageA.fill('input[type="password"]', 'Password123!');
    await pageA.click('button[type="submit"]');
    await expect(pageA).toHaveURL(/.*dashboard/);

    // 2. Create Context B and register Citizen B, then open /incidents feed
    const contextB = await browser.newContext({
      geolocation: { latitude: 12.9716, longitude: 77.5946 },
      permissions: ['geolocation'],
    });
    const pageB = await contextB.newPage();

    await pageB.goto('/signup');
    await pageB.fill('input[type="text"]', 'Citizen B');
    await pageB.fill('input[type="email"]', citizenBEmail);
    await pageB.fill('input[type="password"]', 'Password123!');
    await pageB.click('button[type="submit"]');
    await expect(pageB).toHaveURL(/.*dashboard/);

    await pageB.goto('/incidents');
    await expect(pageB.locator('h1')).toContainText('Citizen Incident Feed');

    // 3. Citizen A submits an incident
    await pageA.goto('/report');
    await pageA.fill('input[placeholder*="Broken streetlight"]', incidentTitle);
    await pageA.selectOption('select', 'safety');
    await pageA.fill('textarea[placeholder*="Describe the issue"]', 'Live emergency reporting across sessions');
    await pageA.click('button:has-text("Use My Current Location")');
    await expect(pageA.locator('text=Location acquired')).toBeVisible({ timeout: 10000 });
    await pageA.click('button[type="submit"]');
    await expect(pageA.locator('text=Incident reported successfully')).toBeVisible();

    // 4. Assert Context B receives and renders the incident via Socket.IO without page reload
    await expect(pageB.locator(`text=${incidentTitle}`)).toBeVisible({ timeout: 15000 });
    await expect(pageB.locator('text=New incident reported nearby')).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
