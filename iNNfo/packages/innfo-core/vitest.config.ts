import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    pool: 'forks',
    // Vitest 4: poolOptions removed; fileParallelism:false is the singleFork replacement.
    fileParallelism: false,
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
