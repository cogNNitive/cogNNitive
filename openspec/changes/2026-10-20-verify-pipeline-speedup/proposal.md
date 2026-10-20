# Proposal: Verify Pipeline & Session Workflow Speedup

## Intent

Local verification (`node scripts/verify.js`), pre-push checks, and session worktree startup currently impose severe latency on Windows (~3–4 minutes for full `verify.js`, ~1.5–2 minutes for `nn-session.mjs start`, and slow serial pre-push checks). Root causes include 26 read-only guards serialized after the worker pool, 74 synchronous `git show` spawns in `docs-facts-drift`, massive subprocess storms in test suites (spawning hundreds of `git` and `node scripts/export-console.mjs` processes), redundant `npm ci` runs per worktree, and inner-loop skill rules prescribing full suite runs on every edit. This change eliminates subprocess bottlenecks, parallelizes read-only checks, reuses worktree dependencies safely, and aligns maintainer skills with tiered inner-loop verification.

## Scope

### In Scope
- **`scripts/verify.js` parallelization & filtering**: Mark 26 read-only child-process guards (`0c`, `4`, `4b`, `5`–`7d`, `12`–`15`) as `parallel: true`; raise default `resolveJobs()` cap to `Math.min(8, Math.max(1, Math.floor(cpuCount * 0.75)))`; batch `checkHandTypedFactsAtRef` via `git cat-file --batch` and run `docs-facts-drift` asynchronously in the pool; add `--only=<substring>` (and `--only <substring>`) filtering; update `SLOW_SUITES` with the 8 suites exceeding 7s; add `"verify:fast"` to `package.json`.
- **Test suite subprocess elimination**: Clone template git fixtures once per file via `fs.cpSync` in `scripts/lib/batch-status.test.mjs`, `scripts/nn-session.test.mjs`, and `scripts/release/run-release.test.js`; stub redundant `npm ci` runs in `nn-session.test.mjs`; expose an in-process programmatic API from `scripts/export-console.mjs` and migrate `scripts/export-console.test.mjs`, `test/console-export.test.mjs`, `test/console-export-view.test.mjs`, and `test/console-sample-custom-view.test.mjs` (plus shared read-only `JSDOM` instances), retaining 2–3 CLI smoke tests.
- **Session, pre-push & skill streamlining**: Parallelize `FRESHNESS_GUARDS` in `scripts/pre-push-check.js`; bypass heavy pre-push builds/checks when pushing `wip:` commits to `session/*` branches in `.githooks/pre-push` / `scripts/pre-push-check.js`; reuse/junction `node_modules` in `scripts/nn-session.mjs start` when lockfiles match (with `--full-install` override); update `scripts/check-integrity.js`, `.agents/skills/nn-dev-development/SKILL.md`, and `.agents/skills/nn-dev-check-integrity/SKILL.md` to prescribe targeted/`--fast` checks during sessions and reserve full `verify.js` for the `dev -> main` batch gate.

### Out of Scope
- Reducing test coverage, deleting assertions, or weakening `dev -> main` merge gates.
- Changing CI workflow definitions (`.github/workflows/`).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `quality-gates`: Parallel execution of read-only guards, batched git reads for `docs-facts-drift`, expanded worker pool sizing, `--only` filter flag, and updated `SLOW_SUITES` roster.
- `console-export-cli`: Exportable in-process programmatic API from `scripts/export-console.mjs` alongside CLI execution.
- `native-pre-push-hook`: Parallel freshness guard execution and fast-path bypass for `wip:` checkpoint pushes to `session/*` branches.
- `dev-skills`: Lockfile-verified `node_modules` junction reuse in `nn-session.mjs start` and tiered inner-loop vs. batch-gate verification in `nn-dev-development` and `nn-dev-check-integrity`.

## Approach

Convert serial child-process bottlenecks into parallel worker-pool tasks and in-process calls, replace per-test `git init`/`commit` setup with `before()` template cloning via `fs.cpSync`, use Windows-compatible directory junctions (`'junction'`) for worktree `node_modules` when lockfiles match, and codify fast inner-loop verification in maintainer skills.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `scripts/verify.js`, `package.json` | Modified | Parallel guards, `git cat-file --batch`, worker pool cap, `--only` flag, `SLOW_SUITES`, `verify:fast` script |
| `scripts/export-console.mjs` & console tests | Modified | Programmatic API export, in-process test execution, `JSDOM` reuse |
| `scripts/lib/batch-status.test.mjs`, `scripts/nn-session.test.mjs`, `scripts/release/run-release.test.js` | Modified | `before()` git fixture template + `fs.cpSync` cloning; avoid duplicate `npm ci` in tests |
| `scripts/pre-push-check.js`, `.githooks/pre-push` | Modified | Parallel `FRESHNESS_GUARDS` and `wip:` on `session/*` fast-path |
| `scripts/nn-session.mjs`, `scripts/check-integrity.js`, `.agents/skills/nn-dev-*/SKILL.md` | Modified | `node_modules` junction reuse on `start` (`--full-install` opt-out) and tiered verification workflow |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Shared in-process state in `export-console.mjs` tests | Low | Ensure programmatic entry point takes explicit options/paths and returns structured results without mutating globals |
| Stale `node_modules` junction when lockfile changes | Low | Compare SHA-256 of root and `skills/nn-sources` `package-lock.json` against primary checkout; fall back to `npm ci` on mismatch or `--full-install` |

## Rollback Plan

Revert the commit batch on `dev`; all changes are confined to local verification scripts, test harnesses, git hooks, and maintainer skill docs with zero runtime schema or package publishing impact.

## Dependencies

- Node.js built-in `fs.cpSync`, `fs.symlinkSync(..., 'junction')`, and `child_process`.

## Success Criteria

- [ ] `node scripts/verify.js` completes with 100% pass rate and significantly reduced wall-clock time (~50%+ faster).
- [ ] `node scripts/verify.js --fast` and `node scripts/verify.js --only=<substring>` execute targeted/fast checks cleanly.
- [ ] `export-console`, `batch-status`, `nn-session`, and `run-release` test suites pass in seconds without subprocess storms.
- [ ] `nn-session.mjs start` reuses `node_modules` via junction when lockfiles match and supports `--full-install`.
- [ ] `pre-push-check.js` runs freshness guards in parallel and skips heavy checks only for `wip:` commits pushed to `session/*`.
