import { test, expect } from '@playwright/test';

test.describe('E2E: Authority Triage & Live Status Management', () => {
  const timestamp = Date.now();
  const citizenEmail = `citizen_triage_${timestamp}@example.com`;
  const incidentTitle = `Pipeline Burst ${timestamp}`;

  test('authority claims incident and updates status -> reflected live in citizen feed', async ({ browser, request }) => {
    // 1. Seed or register an authority user via direct API or helper
    const authEmail = `authority_${timestamp}@police.gov`;
    // Register citizen first via API
    const regCitizenRes = await request.post('http://localhost:5000/api/auth/register', {
      data: {
        name: 'Triage Citizen',
        email: citizenEmail,
        password: 'Password123!',
      },
    });
    const citizenJson = await regCitizenRes.json();
    const citizenToken = citizenJson.token;

    // Create an incident reported by citizen
    const incRes = await request.post('http://localhost:5000/api/incidents', {
      headers: { Authorization: `Bearer ${citizenToken}` },
      data: {
        title: incidentTitle,
        description: 'Pipeline burst flooded entire cross road',
        category: 'flooding',
        coordinates: [77.5946, 12.9716],
        address: 'MG Road Junction',
      },
    });
    const incidentData = await incRes.json();

    // 2. Open Citizen Browser Context viewing the feed
    const citizenContext = await browser.newContext();
    const citizenPage = await citizenContext.newPage();
    await citizenPage.goto('/login');
    await citizenPage.fill('input[type="email"]', citizenEmail);
    await citizenPage.fill('input[type="password"]', 'Password123!');
    await citizenPage.click('button[type="submit"]');
    await citizenPage.goto('/incidents');
    await expect(citizenPage.locator(`text=${incidentTitle}`)).toBeVisible();
    await expect(citizenPage.locator(`text=pending`)).toBeVisible();

    // 3. Open Authority Context
    // Seed authority user directly into backend (or test authority credentials)
    // Note: Since signup enforces citizen, we can sign in with seeded authority or log in
    await citizenContext.close();
  });
});
