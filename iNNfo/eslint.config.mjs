// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import configPrettier from 'eslint-config-prettier'

/**
 * Flat ESLint config for the iNNfo monorepo.
 *
 * Scope: TypeScript across all workspaces + Vue SFCs in apps/innfo-editor.
 * Formatting is delegated to Prettier (configPrettier disables stylistic rules),
 * so ESLint focuses on correctness and consistency only.
 */
export default tseslint.config(
  {
    // Global ignores — build output, deps, test artifacts, and stale packages.
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/e2e-reports/**',
      '**/test-results/**',
      '**/*.snap',
      'packages/format-core/**',
      'packages/format-mcp/**',
      'archive/**',
      'Sandbox/**',
      // Published/built site output (bundled + minified) — not source.
      'docs/app/**',
      '**/*.min.js',
      '**/*.bundle.js',
      'packages/innfo-mcp/bin/**',
      'apps/innfo-editor/scratch_graph_test.mjs',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  // 'essential' covers correctness only; Prettier owns formatting/style, so we
  // deliberately avoid 'flat/recommended' to prevent overlapping style rules.
  ...pluginVue.configs['flat/essential'],

  {
    // Vue SFCs use the Vue parser with the TS parser for <script> blocks.
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },

  {
    files: ['**/*.{ts,mts,vue}'],
    rules: {
      // TypeScript already resolves globals (DOM lib types like
      // FileSystemDirectoryHandle); the core `no-undef` rule can't and produces
      // false positives, so it must be off for TS/Vue.
      'no-undef': 'off',

      // ── Ratchet backlog ─────────────────────────────────────────────
      // These are real debt but non-blocking. Kept as warnings so `lint`
      // (which gates on errors) passes on the existing codebase while the
      // count is driven down over time. New code should not add to them.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-useless-escape': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/prefer-as-const': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      // Direct prop mutation (BlockSheet.vue) — tracked for a data-flow fix
      // that routes edits through the store; see the SDD change tasks.
      'vue/no-mutating-props': 'warn',
      'vue/no-unused-vars': 'warn',

      // Component files here are intentionally single-word (Header, Badge, ...).
      'vue/multi-word-component-names': 'off',
    },
  },

  {
    // Node-context config and script files.
    files: ['**/*.config.{js,ts}', 'scripts/**/*.{js,mjs,ts}', '**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', __dirname: 'readonly', console: 'readonly' },
    },
  },

  configPrettier,
)
