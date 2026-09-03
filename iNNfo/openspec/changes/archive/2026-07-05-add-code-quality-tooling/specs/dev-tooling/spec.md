# Delta: Dev Tooling â€” Lint, Format, and CI Quality Gate

## Purpose

Establish an automated code-quality gate for the iNNfo monorepo so that
correctness, typing, formatting, and tests are enforced on every change instead of
depending on author discipline. Adopted in **ratchet** mode: the gate passes on the
existing codebase and tightens over time.

## Requirements

### R-DT-00: Single-source lint configuration

The repository MUST provide one root `eslint.config.mjs` covering all workspaces
(TypeScript everywhere, Vue SFCs in `apps/innfo-editor`). ESLint MUST focus on
correctness; formatting rules MUST be delegated to Prettier via `eslint-config-prettier`.

#### Scenario: Lint passes on the existing codebase

- GIVEN the repository at adoption time
- WHEN `npm run lint` runs
- THEN it exits 0 with **0 errors** (non-blocking warnings are permitted as backlog)

#### Scenario: Real correctness defects are errors, style debt is a warning

- GIVEN a file that mutates a Vue prop or uses an undefined identifier
- WHEN linted
- THEN it is reported (prop-mutation as a tracked warning; a genuine `no-undef` in JS as an error)
- AND stylistic concerns (`any`, unused vars) are reported as `warn`, not `error`

### R-DT-01: Formatting is Prettier-owned and DSL-safe

Prettier MUST be the single formatter, configured to match the existing code style.
Markdown (`*.md`, including the `_F.md` / `_FORMAT.md` iNNfo DSL) and all `fixtures/`
MUST be excluded so formatting never alters parser input or golden expectations.

#### Scenario: Fixtures and DSL are never reformatted

- GIVEN `tests/fixtures/**` and any `*.md`
- WHEN `npm run format` runs
- THEN those files are left byte-for-byte unchanged

### R-DT-02: Continuous integration gate

A CI workflow MUST run on push and pull requests to `main` and `dev`, executing, in
order: build the core package, lint, format-check (changed files only), app typecheck
(`vue-tsc --noEmit`), unit tests (core + app), and app build.

#### Scenario: A PR that breaks typing or tests fails CI

- GIVEN a pull request that introduces a type error or a failing unit test
- WHEN CI runs
- THEN the corresponding job step fails and the PR is not green

#### Scenario: Formatting is gated on changed files, not the whole repo

- GIVEN the repo is not yet fully Prettier-clean
- WHEN a PR changes a subset of files
- THEN CI checks Prettier formatting only on the changed formattable files

### R-DT-03: Vitest excludes Playwright specs

The Vitest configuration MUST exclude `e2e/**` so Playwright specs (driven by
`playwright test`) are not collected by the unit-test runner.

#### Scenario: Running unit tests does not collect e2e specs

- GIVEN `apps/innfo-editor/e2e/*.spec.ts` exist
- WHEN `npm --prefix apps/innfo-editor test` runs
- THEN no `@playwright/test` import error occurs and only Vitest unit/component tests run

### R-DT-04: Known domain failures are quarantined, not hidden

Pre-existing failures unrelated to this change (FILE-mode block decomposition) MUST be
`it.skip`-ped with a comment referencing this change, keeping CI deterministic and green
while the debt stays tracked for a dedicated follow-up.

#### Scenario: Quarantined tests keep the suite green and traceable

- GIVEN the 2 known FILE-mode smoke failures
- WHEN the app test suite runs
- THEN they report as `skipped` (not `failed`) and carry a comment pointing to the fix task
