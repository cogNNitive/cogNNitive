# quality-gates Specification

## Purpose

Deterministic verification covers the existing root manifest suites, tracked-text
encoding validity, local pre-push CI parity (coverage and spec URLs), git-aware
repository scans, a shared temporary-cleanup helper, and the Console release
documentation and stable-tag shape.

## Requirements

### Requirement: Manifest suites in deterministic verification

`scripts/verify.js` MUST dynamically discover and execute all conforming root test suites matching `*.test.js` and `*.test.mjs` (excluding `node_modules`), along with any explicitly registered non-conforming test runners, before reporting deterministic verification as successful.

#### Scenario: All manifest and script test suites run via dynamic discovery

- **GIVEN** `node scripts/verify.js` is invoked
- **WHEN** deterministic verification performs test suite discovery across root script and skill directories
- **THEN** it SHALL dynamically discover and execute all conforming files matching `*.test.js` and `*.test.mjs` (including root manifest test suites and `scripts/lib/shared-libs.test.js`) while excluding `node_modules`
- **AND** it SHALL execute explicitly registered non-conforming suites (`skills/nn-trannsform/test/run.js`, `iNNfo/specs/scripts/test-vocabulary.js`)
- **AND** any nonzero exit SHALL immediately fail deterministic verification.

#### Scenario: Existing manifest suites are not replaced

- **GIVEN** the discovered test suites
- **WHEN** they pass
- **THEN** the implementation SHALL NOT duplicate their assertions in `scripts/verify.js`.

### Requirement: Tracked-text encoding guard

The deterministic checks MUST fail when a tracked text file is known-invalid.

#### Scenario: Replacement character fails fast

- **GIVEN** a tracked text file containing `U+FFFD` or bytes that cannot be
  decoded as UTF-8
- **WHEN** the encoding guard runs
- **THEN** verification SHALL fail and name the file and reason.

#### Scenario: Binary and fixture behavior is explicit

- **GIVEN** binary files, generated bundles, or explicitly allowlisted fixtures
- **WHEN** the guard evaluates them
- **THEN** it SHALL either skip the category by documented rule or require a
  reviewer note for an explicit exception.

### Requirement: Coverage and spec URLs in the local pre-push mirror

The local pre-push CI mirror MUST preserve the two checks that previously
surfaced only in CI.

#### Scenario: Coverage ratchet is visible locally

- **GIVEN** `node scripts/check-integrity.js --pre-push`
- **WHEN** Group 5 executes
- **THEN** it SHALL run:
  - `npm --prefix iNNfo/packages/innfo-core test`
  - `npm --prefix iNNfo/packages/innfo-mcp run test:coverage`
  - `npm --prefix iNNfo/apps/innfo-editor test`
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

### Requirement: Git-aware repository scans

Repository integrity scans MUST distinguish project files from gitignored local
artifacts when repository metadata is available.

#### Scenario: Ignored caches are excluded

- **GIVEN** a git checkout containing gitignored local artifacts
- **WHEN** `check-spec-version.mjs` collects repository files
- **THEN** tracked files and nonignored untracked files SHALL be scanned
- **AND** gitignored files SHALL be excluded.

#### Scenario: No git metadata

- **GIVEN** git metadata is unavailable
- **WHEN** the scan runs
- **THEN** it SHALL preserve the previous filesystem behavior rather than fail.

#### Scenario: Allowlist categories remain explicit

- **GIVEN** archive, dist, generated, or fixture exclusions
- **WHEN** scanning
- **THEN** existing explicit exclusions SHALL remain in force and SHALL NOT be
  broadened implicitly by git filtering.

### Requirement: Shared temporary-cleanup helper

Temporary-directory cleanup in `innfo-mcp` tests MUST use one shared resilient
helper.

#### Scenario: Transient Windows cleanup failures retry

- **GIVEN** `EBUSY`, `EPERM`, or `ENOTEMPTY` during temporary cleanup
- **WHEN** the shared helper executes
- **THEN** it SHALL retry briefly with a bounded delay.

#### Scenario: Nontransient failures still fail

- **GIVEN** any other filesystem error
- **WHEN** cleanup executes
- **THEN** it SHALL throw without masking the original error.

#### Scenario: No duplicated cleanup logic

- **GIVEN** `check-workspace.spec.ts` and `resolver-node.spec.ts`
- **WHEN** temporary cleanup runs
- **THEN** both SHALL import the shared helper rather than implementing local
  retry loops.

### Requirement: Console release documentation and tag shape

`nn-dev-release` MUST name Console explicitly and reject a tag that cannot
validate.

#### Scenario: Console is a release option

- **GIVEN** a maintainer asks for a Console release
- **WHEN** the release flow identifies the subsystem
- **THEN** `nn-dev-release` SHALL include a Console option covering the bundle,
  manifest pin, CDN check, and tag.

#### Scenario: Console stable tag shape is normative

- **GIVEN** a Console release for the stable channel
- **WHEN** a tag is proposed
- **THEN** the tag SHALL match the repository snapshot shape requiring `-v`
  before the semantic version, for example `innfo-console-v0.1.0`.
- **AND** a non-`-v` stable tag SHALL stop the release flow.

### Requirement: Comprehensive template version synchronization and verification

`npm run sync:versions` MUST regenerate all generated artifacts invalidated by template version changes (including `iNNfo/specs/templates/catalog.json`), and `npm run check:versions` MUST verify the freshness of all generated artifacts (including `catalog.json`) against their source definitions.

#### Scenario: Sync regenerates template catalog alongside version copies and manifest

- **GIVEN** a template version bump or template file modification
- **WHEN** `npm run sync:versions` is executed
- **THEN** it SHALL synchronize template version copies (`scripts/sync-template-versions.mjs`)
- **AND** it SHALL generate the stable manifest (`scripts/manifest/generate-manifest.js --channel stable`)
- **AND** it SHALL regenerate `iNNfo/specs/templates/catalog.json` via `scripts/template-catalog.mjs`.

#### Scenario: Version freshness check detects stale template catalog

- **GIVEN** `iNNfo/specs/templates/catalog.json` is missing or out-of-sync with template definitions
- **WHEN** `npm run check:versions` is executed
- **THEN** it SHALL detect the catalog drift via `scripts/template-catalog.mjs --check`
- **AND** it SHALL exit with a non-zero status code.

#### Scenario: Version check passes when all artifacts are synchronized

- **GIVEN** template version copies, stable manifest, and template catalog are all up-to-date
- **WHEN** `npm run check:versions` is executed
- **THEN** all three verification steps SHALL pass with exit code 0.