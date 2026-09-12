import { test, expect } from '@playwright/test';

test.describe('E2E: RBAC Security Boundaries & Route Guarding', () => {
  const timestamp = Date.now();
  const citizenEmail = `rbac_citizen_${timestamp}@citywatch.org`;

  test('citizen navigating to /authority or /authority/analytics is redirected to /dashboard', async ({ page }) => {
    // 1. Register as a citizen
    await page.goto('/signup');
    await page.fill('input[type="text"]', 'RBAC Citizen');
    await page.fill('input[type="email"]', citizenEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // 2. Direct navigation attempt to /authority (Queue)
    await page.goto('/authority');
    // RequireRole must redirect citizen back to /dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Authority Triage Queue')).not.toBeVisible();

    // 3. Direct navigation attempt to /authority/analytics
    await page.goto('/authority/analytics');
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Analytics')).not.toBeVisible();
  });

  test('underlying authority APIs reject citizen tokens with 403 Forbidden', async ({ request }) => {
    // 1. Authenticate citizen via API
    const regRes = await request.post('http://localhost:5000/api/auth/register', {
      data: {
        name: 'API RBAC Citizen',
        email: `api_rbac_${timestamp}@citywatch.org`,
        password: 'Password123!',
      },
    });
    const citizenJson = await regRes.json();
    const token = citizenJson.token;

    // 2. Attempt GET /api/incidents/queue
    const queueRes = await request.get('http://localhost:5000/api/incidents/queue', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(queueRes.status()).toBe(403);

    // 3. Attempt GET /api/analytics
    const analyticsRes = await request.get('http://localhost:5000/api/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(analyticsRes.status()).toBe(403);

    // 4. Attempt unauthenticated GET /api/incidents/queue (401)
    const unauthRes = await request.get('http://localhost:5000/api/incidents/queue');
    expect(unauthRes.status()).toBe(401);
  });
});
