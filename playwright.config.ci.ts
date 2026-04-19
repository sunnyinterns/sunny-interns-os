import { defineConfig } from '@playwright/test'

const SUITE = process.env.TEST_SUITE ?? 'all'
const suiteToGlob: Record<string, string> = {
  A: 'tests/workflow/**/*.ts', B: 'tests/branches/**/*.ts',
  C: 'tests/admin/**/*.ts',   E: 'tests/settings/**/*.ts',
  all: 'tests/**/*.ts',
}

export default defineConfig({
  testDir: './',
  testMatch: suiteToGlob[SUITE] ?? suiteToGlob['all'],
  timeout: 45000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'https://sunny-interns-os.vercel.app',
    headless: true,
    // Screenshot après chaque test (pas seulement en cas d'échec)
    screenshot: 'on',
    video: 'retain-on-failure',
    // Viewport standard
    viewport: { width: 1280, height: 800 },
  },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
    ['./src/lib/supabase-reporter.ts'],
  ],
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/, use: { headless: true } },
    { name: 'chromium', use: { storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
  ],
})
