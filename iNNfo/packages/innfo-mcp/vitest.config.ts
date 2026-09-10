import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'bin/**',
        'tests/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.d.ts',
        '*.config.ts',
      ],
      // Ratchet thresholds, set a couple of points below the measured baseline so
      // CI fails on a REGRESSION, not on the current level.
      // 2026-08-07 baseline: lines 95.2%, branches 86.94%, funcs 97.72%, stmts 95.2%.
      // But coverage gates (90/85/95/90) were never wired into CI, so coverage
      // silently drifted DOWN to the 2026-09-10 baseline: lines/stmts 88.03%,
      // branches 78.55%, funcs 89.4%. Thresholds are ratcheted to that floor and
      // enforced in CI (`test:coverage`); backfill lowest-first toward the
      // original 90/85/95/90 (see backlog #5).
      thresholds: {
        lines: 88,
        branches: 78,
        functions: 89,
        statements: 88,
      },
    },
  },
})
