import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    geolocation: { latitude: 12.9716, longitude: 77.5946 },
    permissions: ['geolocation'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: './backend',
      port: 5000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        PORT: '5000',
        CLIENT_URL: 'http://localhost:3000',
      },
    },
    {
      command: 'npm run dev',
      cwd: './frontend',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
