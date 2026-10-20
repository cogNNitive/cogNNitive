# Tasks: Verify Pipeline & Session Workflow Speedup

## Review Workload Forecast

| Metric | Estimate | Notes |
|---|---|---|
| Files touched | 17 | `scripts/verify.js`, `package.json`, `scripts/export-console.mjs`, `scripts/pre-push-check.js`, `.githooks/pre-push`, `scripts/nn-session.mjs`, `scripts/check-integrity.js`, 8 test files, 2 skill docs |
| Net LOC delta | ~350–450 |Mostly test harness consolidation (`fs.cpSync` templates, in-process calls) and worker-pool wiring |
| Work units | 6 phases | Ordered by dependency; lands on `dev` from session worktree `session/verify-pipeline-speedup` |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: `scripts/verify.js` Pool, `--only` Filter, `SLOW_SUITES`, & `git cat-file --batch` (D1, D2)

- [x] 1.1 Add failing unit tests in `scripts/verify.test.js` covering `--only=<substring>` / `--only <substring>` filtering (including non-zero exit when zero steps/suites match), `resolveJobs()` default scaling (`Math.min(8, Math.max(1, Math.floor(cpuCount * 0.75)))`), parallel flag on the 26 read-only guards (`0c`, `4`, `4b`, `5`–`7d`, `12`–`15`), updated `SLOW_SUITES` roster, and batched `checkHandTypedFactsAtRef` drift detection.
- [x] 1.2 Update `scripts/verify.js` to mark the 26 read-only guards `parallel: true`, implement `git cat-file --batch` in `checkHandTypedFactsAtRef` (`6c`) as an async parallel step, raise `resolveJobs()` cap, add `--only` CLI/options support, and expand `SLOW_SUITES` with suites >7s (`scripts/check-licenses.test.mjs`, `scripts/generate-docs-facts.test.mjs`, `scripts/pre-push-check.test.js`, `scripts/skills-manager.test.js`, `scripts/sync-samples.test.mjs`, `scripts/verify.test.js`, `test/console-draft-Reconcile.test.mjs`, `test/console-golden-parity.test.mjs`, `test/init-domain-blueprints.test.mjs`).
- [x] 1.3 Add `"verify:fast": "node scripts/verify.js --fast"` to `package.json` and verify Phase 1 via `node scripts/verify.js --only=verify.test`.

## Phase 2: Git-Heavy Test Suite Template Cloning (D3)

- [x] 2.1 Refactor `scripts/lib/batch-status.test.mjs` to initialize its baseline git repository once in `before()` and clone per-test workspaces via `fs.cpSync(templateDir, testDir, { recursive: true })`.
- [x] 2.2 Refactor `scripts/nn-session.test.mjs` to clone a `before()` template git repo via `fs.cpSync` and replace redundant real `npm ci` runs with lightweight stub/junction verification.
- [x] 2.3 Refactor `scripts/release/run-release.test.js` to build seed local+remote git repositories once in `before()` and clone via `fs.cpSync` per test; verify with `node scripts/verify.js --only=batch-status`, `--only=nn-session`, and `--only=run-release`.

## Phase 3: In-Process `runExportConsole` API & Console Test Suites (D4)

- [x] 3.1 Add unit tests in `scripts/export-console.test.mjs` for programmatic `runExportConsole(argv, options)` returning `{ exitCode, stdout, stderr, writtenFiles }` without calling `process.exit`.
- [x] 3.2 Export `runExportConsole(argv, options)` from `scripts/export-console.mjs` and route CLI execution through it while preserving stdio and exit-code behavior.
- [x] 3.3 Migrate `scripts/export-console.test.mjs`, `test/console-export.test.mjs`, `test/console-export-view.test.mjs`, and `test/console-sample-custom-view.test.mjs` to invoke `runExportConsole` in-process and share read-only `JSDOM` instances per `describe` block (retaining 2–3 CLI subprocess smoke tests).

## Phase 4: Parallel `pre-push-check.js` & `wip:` Session Push Fast-Path (D5)

- [x] 4.1 Add failing unit tests in `scripts/pre-push-check.test.js` for parallel `FRESHNESS_GUARDS` failure collection and the `refs/heads/session/*` + `wip:` commit subject fast-path bypass (ensuring non-`wip:` or `dev`/`main` pushes run the full pipeline).
- [x] 4.2 Update `scripts/pre-push-check.js` and `.githooks/pre-push` to forward git stdin ref lines, skip heavy builds/guards when all pushed commits on `refs/heads/session/*` start with `wip:`, and run `FRESHNESS_GUARDS` concurrently via `Promise.all`.

## Phase 5: Worktree Lockfile Junction Reuse & Maintainer Skill Tiering (D6)

- [x] 5.1 Add unit tests in `scripts/nn-session.test.mjs` for SHA-256 `package-lock.json` comparison, `'junction'` linking of root and `skills/nn-sources` `node_modules`, and fallback to `npm ci` on lockfile mismatch or `--full-install`.
- [x] 5.2 Implement lockfile-verified `node_modules` junction reuse and `--full-install` in `scripts/nn-session.mjs`.
- [x] 5.3 Update `scripts/check-integrity.js` (use `verify.js --fast` in default non-`--pre-push` mode and forward `--fast`/`--only`), `.agents/skills/nn-dev-development/SKILL.md`, and `.agents/skills/nn-dev-check-integrity/SKILL.md` to codify inner-loop vs. batch-gate verification.

## Phase 6: Final Verification & Benchmarks

- [ ] 6.1 Run `npm run lint`, `npm run typecheck`, `node scripts/verify.js --fast`, and full `node scripts/verify.js` to confirm 100% pass rate and reduced wall-clock duration.
