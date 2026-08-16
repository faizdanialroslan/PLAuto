const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/specs',
  globalSetup: require.resolve('./scripts/global-setup.js'),
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // hits a live site, so one retry to absorb a network blip - a real bug still fails twice
  retries: 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright-html', open: 'never' }],
    ['allure-playwright', { resultsDir: 'reports/allure-results' }],
    // feeds scripts/generate-xlsx-report.js - per-project pass/fail for the Excel export
    ['json', { outputFile: 'reports/results.json' }],
  ],
  use: {
    baseURL: 'https://applynow.cimb.com.my',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // SLOWMO=800 npm run test:watch - slows actions down so you can actually watch it
    launchOptions: {
      slowMo: process.env.SLOWMO ? Number(process.env.SLOWMO) : 0,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
