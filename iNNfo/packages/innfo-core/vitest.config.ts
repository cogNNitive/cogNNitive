import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    pool: 'forks',
    // Files run in parallel. Under that load, tests that dynamically import the whole
    // package entry (tests/writeOnce/plan.test.ts) cross the default 5s timeout.
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.d.ts',
        '*.config.ts',
      ],
      // Ratchet thresholds: set a few points below the measured baseline
      // (2026-10-16: lines 87.73%, branches 73.47%, funcs 89.77%, stmts 85.56%)
      // so CI fails on regression, not on first run.
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 75,
        statements: 80,
      },
    },
  },
})
