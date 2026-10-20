# Delta for quality-gates

## ADDED Requirements

### Requirement: Parallel execution and batched git inspection in verify.js

`scripts/verify.js` MUST execute read-only child-process guards (`0c`, `4`, `4b`, `5` through `7d`, and `12` through `15`) with `parallel: true` inside the bounded worker pool alongside discovered test suites, leaving only steps that build or mutate shared workspace state (`0`, `0a`, `0b`, `1`, `2`, `3`, `8`, `9`, `10`, `11`) sequential. When `--jobs` is not passed, `resolveJobs()` MUST size the pool to `Math.min(8, Math.max(1, Math.floor(cpuCount * 0.75)))`. The `docs-facts-drift` guard (`6c`, `checkHandTypedFactsAtRef`) MUST read git blobs via a single batched `git cat-file --batch` subprocess per ref instead of spawning per-file `git show` processes, and MUST execute asynchronously inside the worker pool.

#### Scenario: Read-only guards run concurrently in the worker pool

- **GIVEN** `node scripts/verify.js` runs after sequential build prerequisites (`0`–`3`) complete
- **WHEN** the parallel phase executes
- **THEN** read-only guards (`0c`, `4`, `4b`, `5`–`7d`, `12`–`15`) and discovered test suites SHALL be scheduled concurrently across up to `Math.min(8, Math.max(1, Math.floor(cpuCount * 0.75)))` workers
- **AND** every failure SHALL still be collected and reported before exiting non-zero.

#### Scenario: Batched git blob inspection for docs-facts-drift

- **GIVEN** `checkHandTypedFactsAtRef` inspects markdown and skill files at `HEAD`
- **WHEN** guard `6c` executes
- **THEN** it SHALL resolve file contents via a single `git cat-file --batch` stream per ref rather than per-file `git show` spawns
- **AND** it SHALL detect hand-typed count or version drift identically to per-file inspection.

### Requirement: Targeted and fast verification filtering

`scripts/verify.js` MUST support `--only=<substring>` and `--only <substring>` to filter both numbered steps and discovered test suites by case-insensitive substring match against step `id`, `desc`, `script`, or `cmd`. `SLOW_SUITES` MUST list suites exceeding 7 seconds (`scripts/release/run-release.test.js`, `scripts/nn-session.test.mjs`, `scripts/lib/batch-status.test.mjs`, `scripts/export-console.test.mjs`, `test/console-export.test.mjs`, `test/console-export-view.test.mjs`, `test/console-sample-custom-view.test.mjs`, `test/init-domain-blueprints.test.mjs`) so `node scripts/verify.js --fast` and `npm run verify:fast` skip slow suites during inner-loop checks.

#### Scenario: Filtering verification steps with --only

- **GIVEN** a contributor runs `node scripts/verify.js --only=batch-status`
- **WHEN** `verify.js` filters the step and suite roster
- **THEN** only steps or suites matching `batch-status` (plus required pre-build steps if applicable) SHALL execute
- **AND** if `--only` matches zero steps and zero suites, `verify.js` SHALL exit non-zero with a clear diagnostic message.

#### Scenario: Fast mode skips designated slow suites

- **GIVEN** a contributor runs `npm run verify:fast` or `node scripts/verify.js --fast`
- **WHEN** suite discovery completes
- **THEN** suites listed in `SLOW_SUITES` SHALL be skipped
- **AND** all remaining guards and unit test suites SHALL execute in the parallel pool.

### Requirement: Subprocess-free git fixture cloning in slow test suites

Git-heavy test suites (`scripts/lib/batch-status.test.mjs`, `scripts/nn-session.test.mjs`, and `scripts/release/run-release.test.js`) MUST construct base git repository fixtures once per suite in `before()` and clone them into per-test temporary directories via `fs.cpSync`, avoiding repeated `git init`/`git config`/`git commit` subprocesses and avoiding redundant `npm ci` runs across individual tests.

#### Scenario: Template git fixture is cloned per test

- **GIVEN** `batch-status.test.mjs`, `nn-session.test.mjs`, or `run-release.test.js` runs
- **WHEN** individual test cases create isolated repositories
- **THEN** they SHALL copy the pre-initialized template repository via `fs.cpSync` and apply only test-specific deltas
- **AND** every existing assertion in those suites SHALL continue to pass.
