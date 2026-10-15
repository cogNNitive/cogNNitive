// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import configPrettier from 'eslint-config-prettier'

/**
 * Flat ESLint config for the cogNNitive monorepo.
 *
 * Scope: TypeScript across all workspaces.
 * Formatting is delegated to Prettier (configPrettier disables stylistic rules),
 * so ESLint focuses on correctness and consistency only.
 */
export default tseslint.config(
  {
    // Global ignores — build output, deps, test artifacts, docs, assets, temp.
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/e2e-reports/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/*.snap',
      'archive/**',
      'docs/**',
      'temp/**',
      '_samples_nn/**',
      'simulation/**',
      'ecosystem_NN/**',
      'skills/**',
      '.agents/**',
      '.atl/**',
      '.claude/**',
      '.github/**',
      'openspec/**',
      // Published/built site output (bundled + minified) — not source.
      '**/*.min.js',
      '**/*.bundle.js',
      'iNNfo/packages/innfo-mcp/bin/**',
      // Generated artifacts and blueprints assets
      '**/*.generated.cjs',
      '**/*.generated.js',
      'iNNfo/specs/bluepriNNts/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,mts}'],
    rules: {
      // TypeScript already resolves globals (DOM lib types like
      // FileSystemDirectoryHandle); the core `no-undef` rule can't and produces
      // false positives, so it must be off for TS.
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
    },
  },

  {
    // Web-platform globals that plain JS files rely on (Node 18+ provides fetch and
    // performance; the console fixture runs in a browser). eslint-plugin-vue used
    // to inject these through its base config.
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: { document: 'readonly', fetch: 'readonly', performance: 'readonly' },
    },
  },

  {
    // Node-context config and script files (including template-owned
    // Node scripts under specs/).
    files: ['**/*.config.{js,ts,mjs}', 'scripts/**/*.{js,mjs,ts}', 'iNNfo/specs/**/scripts/**/*.js', '**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    rules: {
      // CJS require() is legitimate in Node harness scripts.
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'no-regex-spaces': 'warn',
    },
  },

  configPrettier,
)
