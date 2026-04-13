import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 60_000,
  },
  retries: 1,
  reporter: 'html',
  use: {
    baseURL: 'https://nexus-xi-ivory.vercel.app',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
