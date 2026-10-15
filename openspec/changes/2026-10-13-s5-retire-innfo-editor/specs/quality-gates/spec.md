# Delta for quality-gates

Scope: **S5-freeze only** (the editor is frozen, not deleted). Every spec removal that
belongs to the deferred delete phase lives under `../deferred-delete/specs/` and MUST NOT
be synced into `openspec/specs/` until S5-delete starts (see `tasks.md`).

## MODIFIED Requirements

### Requirement: Coverage and spec URLs in the local pre-push mirror

The local pre-push CI mirror MUST preserve the two checks that previously
surfaced only in CI. (Previously: Group 5 also ran the `innfo-editor` test suite, which is frozen with S5-freeze and no longer part of any gate.)

#### Scenario: Coverage ratchet is visible locally

- **GIVEN** `node scripts/check-integrity.js --pre-push`
- **WHEN** Group 5 executes
- **THEN** it SHALL run:
  - `npm --prefix iNNfo/packages/innfo-core test`
  - `npm --prefix iNNfo/packages/innfo-mcp run test:coverage`
- **AND** a coverage-threshold failure SHALL fail the gate.

#### Scenario: Spec-URL resolution is visible locally

- **GIVEN** the same pre-push gate
- **WHEN** Group 5 executes
- **THEN** it SHALL run:
  - `npm --prefix iNNfo run check:spec-urls`
- **AND** a URL or legacy-reference failure SHALL fail the gate.

#### Scenario: Residual CI nonequivalence is documented

- **GIVEN** the pre-push implementation
- **WHEN** a CI-only behavior remains intentionally unmirrored
- **THEN** `scripts/check-integrity.js` or its Group 5 documentation SHALL name
  the behavior and reason.

## REMOVED Requirements

### Requirement: MCP CDN bundle staging is independent of the editor build

(Reason: the docs build no longer builds the editor (S5-freeze); the requirement is restated against the docs build under a new name.)
(Migration: Replaced by "MCP CDN bundle staging is independent of the docs build".)

## ADDED Requirements

### Requirement: MCP CDN bundle staging is independent of the docs build

The innfo-mcp CDN bundle MUST be staged by a dedicated script (`scripts/stage-mcp-bundle.mjs`) that copies the committed `bin/innfo-mcp.bundle.js` byte-for-byte, so CDN bytes equal the raw-pinned bytes. Staging MUST NOT be a `verify.js` step and MUST NOT be part of `scripts/build-docs.mjs`; the release workflow performs it, and the single-file (no code-splitting) guard moves with it. The `verify` CI job MUST NOT run the docs build; a separate `site` job builds the docs and uploads the pages artifact. Building the docs MUST NOT be required to stage the CDN bundle, and staging MUST NOT be required to build the docs.

#### Scenario: Bundle staged without the docs build
- GIVEN the docs build has not run
- WHEN the staging script runs
- THEN the CDN bundle is staged with bytes equal to the committed bundle

#### Scenario: Docs build does not stage the bundle
- GIVEN `scripts/build-docs.mjs` runs
- WHEN it completes
- THEN it did not perform the CDN bundle staging

### Requirement: A frozen app is outside every gate

An app that is frozen (source kept in place, no longer maintained) MUST NOT be an npm workspace member and MUST NOT be built, typechecked, linted, tested or version-synced by any gate: root `package.json` scripts, the pre-push hook, CI jobs, `scripts/build-docs.mjs`, `scripts/sync-versions.mjs`, `scripts/check-integrity.js`, `scripts/verify.js` suite discovery and the repo-wide source guards. A frozen app MUST carry a `FROZEN.md` explaining the state and the thaw steps. Dependencies that gated suites import MUST be declared by a gated package, never only by the frozen app.

A frozen app that is hosted MUST be published from a committed static build (`docs/innfo/app/`) so that the full-replace Pages publish keeps serving it.

#### Scenario: Gated surfaces never reference the frozen editor
- GIVEN the frozen `iNNfo/apps/innfo-editor`
- WHEN `test/no-editor-references.test.mjs` scans the root workspaces, CI workflows, the pre-push hook, build scripts and `verify.js`
- THEN none of them references `innfo-editor` or builds `iNNfo/apps`

#### Scenario: Gated suites do not depend on the frozen app for test environments
- GIVEN a gated test imports `jsdom` or `happy-dom`
- WHEN the editor workspace is absent
- THEN both packages resolve from root `devDependencies`

#### Scenario: The hosted app survives a Pages publish
- GIVEN the site is built without building the editor
- WHEN `docs/innfo/app/` is staged into the Pages artifact
- THEN `index.html` and `assets/` from the committed snapshot are present and `FROZEN.md` exists next to the editor source
