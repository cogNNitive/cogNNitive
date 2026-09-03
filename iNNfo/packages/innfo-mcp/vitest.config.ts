import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
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
      // Ratchet thresholds: set a few points below the measured baseline
      // (2026-08-07: lines 95.2%, branches 86.94%, funcs 97.72%, stmts 95.2%)
      // so CI fails on regression, not on first run.
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 95,
        statements: 90,
      },
    },
  },
})
