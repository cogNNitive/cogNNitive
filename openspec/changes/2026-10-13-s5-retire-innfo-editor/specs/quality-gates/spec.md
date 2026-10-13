# Delta for quality-gates

## MODIFIED Requirements

### Requirement: Coverage and spec URLs in the local pre-push mirror

The local pre-push CI mirror MUST preserve the two checks that previously
surfaced only in CI. (Previously: Group 5 also ran the `innfo-editor` test suite, retired with S5.)

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

(Reason: the editor build no longer exists; the requirement is restated against the docs build under a new name.)
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
