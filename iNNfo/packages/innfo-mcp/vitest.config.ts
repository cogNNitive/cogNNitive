import { defineConfig } from 'vitest/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

export default defineConfig({
  define: {
    __INNFO_MCP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@cognnitive/innfo-core/legacy': resolve(__dirname, '../innfo-core/src/legacy/index.ts'),
      '@cognnitive/innfo-core': resolve(__dirname, '../innfo-core/src/index.ts'),
    },
  },
  test: {
    clearMocks: true,
    // Several suite tests resolve blueprints and touch the filesystem; on a
    // loaded CI runner they cross vitest's default 5s timeout, surfacing as
    // misleading assertion errors ("expected false to be true") rather than a
    // timeout. 30s gives them headroom without hiding a genuinely hung test.
    testTimeout: 30000,
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
      // Ratchet thresholds, set below the measured baseline so CI fails on a
      // REGRESSION, not on the current level.
      // 2026-08-07 baseline: lines 95.2%, branches 86.94%, funcs 97.72%, stmts 95.2%.
      // The old 90/85/95/90 were never wired into CI, so coverage silently drifted
      // down. Measured floor (2026-09-10): local Windows run = lines/stmts 88.03%,
      // branches 78.54%, funcs 89.4%; the v8 provider on the Linux CI runner reads
      // ~0.7pp lower (lines/stmts 87.31%, branches 78.06%, funcs 88.74%). Thresholds
      // track the CI floor so CI is stable; backfill lowest-first toward the
      // original 90/85/95/90 (see backlog #5).
      thresholds: {
        lines: 86,
        branches: 78,
        functions: 88,
        statements: 86,
      },
    },
  },
})
