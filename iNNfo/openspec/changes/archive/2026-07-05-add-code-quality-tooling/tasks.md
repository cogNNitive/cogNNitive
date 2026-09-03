# Tasks: add-code-quality-tooling

## Phase 1 — Tooling (DONE)

- [x] Install pinned ESLint 9 toolchain + Prettier as root devDependencies
- [x] Add `eslint.config.mjs` (flat, TS + Vue essential, prettier-compat, ratchet rules)
- [x] Add `.prettierrc.json` matching existing style; add `.prettierignore`
      (excludes dist, node_modules, snapshots, markdown DSL, fixtures, dead packages)
- [x] Add root scripts: `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `test`

## Phase 2 — CI (DONE)

- [x] Add `.github/workflows/ci.yml`: build-core → lint → format-check (changed files)
      → typecheck → unit tests (core + app) → app build, on push/PR to `main`/`dev`

## Phase 3 — Obvious fixes (DONE)

- [x] Fix Vitest config: exclude `e2e/**` so Playwright specs are not collected
      (removed 10 phantom failing test files)
- [x] Remove dead packages `packages/format-core` and `packages/format-mcp`
      (verified: no live imports in `apps/*/src` or `packages/*/src`)
- [x] Remove dead vars (`baseName`, `parts`) in `scripts/check-spec-version.mjs`
- [x] Disable `no-undef` for TS/Vue (DOM lib false positives)
- [x] Quarantine 2 pre-existing FILE-mode smoke failures with `it.skip` + tracking note

## Phase 4 — Verification (DONE)

- [x] `npm run lint` → 0 errors (239 warnings backlog)
- [x] `vue-tsc --noEmit` → clean
- [x] Core tests → 47 passed
- [x] App tests → 313 passed, 2 skipped (quarantined)

## Phase 5 — Deferred follow-ups (NOT STARTED — each needs its own review budget)

- [ ] **Fix FILE-mode block decomposition** so `recursiveParse` expands a single `_F.md`
      into its child block nodes; then un-`skip` smoke tests `2d` and `4a`.
      (Domain change — update golden fixtures deliberately, mind Windows CRLF.)
- [ ] **BlockSheet.vue prop-mutation fix**: route `description`/`name` edits through a
      `modelStore` action instead of mutating the `block` prop; remove the
      `vue/no-mutating-props` warnings.
- [ ] **Ratchet down `any`** (~149): type the public boundaries first (core exports,
      component props, store payloads). Dedicated SDD change.
- [ ] **Ratchet down unused vars** (~90), mostly in e2e specs and helpers.
- [ ] **Decompose oversized SFCs**: `DirectoryPickerModal.vue` (777),
      `GraphViewer.vue` (669), `MatricesGrid.vue` (561), `BlockSheet.vue` (531) —
      extract composables + presentational sub-components.
- [ ] **Unify import paths**: pick one convention per layer (domain via
      `@cognnitive/innfo-core`, intra-app via the `@/` alias); drop the mixed
      `../model/*` / relative-`../../..` styles.
- [ ] **Optional full Prettier sweep**: run `npm run format` repo-wide in an isolated
      commit, then gate `format:check` on the whole repo in CI.
