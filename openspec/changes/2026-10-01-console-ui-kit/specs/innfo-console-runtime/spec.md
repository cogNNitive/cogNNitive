# Delta for innfo-console-runtime

## MODIFIED Requirements

### Requirement: Shared UMD/IIFE Runtime

The system MUST ship a single versioned `innfo-runtime.js` as a UMD/IIFE global (`window.InnfoConsole`). The console bundle MUST also include `ui-kit.js` (`window.InnfoUI`), ordered before any module that consumes it, and MUST inject the design tokens at boot. The runtime and kit MUST NOT use `fetch()` and MUST NOT use `type=module`. They MUST be hosted on GitHub Pages and jsDelivr, with a vendored local fallback for offline use.
(Previously: the bundle did not include `ui-kit.js` or token injection.)

#### Scenario: Offline file:// open
- GIVEN a generated console referencing the runtime
- WHEN opened via `file://` double-click with no network
- THEN the console renders fully from the local fallback

#### Scenario: No module primitives in runtime
- GIVEN the published `innfo-runtime.js` and bundle
- WHEN scanned for `fetch(` and `type=module`
- THEN neither token appears

#### Scenario: Kit available before consumers
- GIVEN the bundle loaded
- WHEN `InnfoConsole` and `InnfoModelViewer` initialize
- THEN `window.InnfoUI` is already defined

## ADDED Requirements

### Requirement: Bundle Matches Its Sources

`innfo-console.bundle.js` MUST equal the output of `scripts/build-console-bundle.mjs` over its declared `SOURCES`, which MUST include `ui-kit.js`. Root npm scripts `build:console` (build) and `check:console-bundle` (drift check) MUST exist. A node:test drift suite, wired into `verify.js` and `check-integrity.js`, MUST fail when the checked-in bundle differs from a fresh build. The build process MUST be documented.

#### Scenario: Fresh bundle passes
- GIVEN sources unchanged since the last build
- WHEN `check:console-bundle` runs
- THEN it passes

#### Scenario: Stale bundle fails
- GIVEN `ui-kit.js` edited without rebuilding
- WHEN the drift suite runs
- THEN it fails naming the bundle

#### Scenario: Drift check can go red
- GIVEN the checked-in bundle with one byte altered
- WHEN the drift suite runs
- THEN it fails

#### Scenario: Preexisting drift is absorbed
- GIVEN the checked-in bundle differs from a fresh build before this change
- WHEN the first slice lands
- THEN the bundle is regenerated so the drift suite passes

### Requirement: Released Bundle Is Versioned

A changed bundle MUST ship under a new `innfo-console-v*` tag and a new CDN file; a published tagged bundle MUST NOT be overwritten. This change and change C (`2026-10-01-console-review-ux`) MUST ship under ONE `innfo-console-v*` tag. Version references MUST be produced by `channel-refs.js` and `sync-versions.mjs`, never hand-edited. Shell edits under `bluepriNNts/**` MUST be accompanied by a `blueprints-v*` tag (not `templates-v*`) and a repin in the same batch. Frozen vendored bundle copies (the three sample/export copies and two innfo-core test fixtures) MUST each be declared frozen or regenerated explicitly.

#### Scenario: Refs are derived
- GIVEN the release batch
- WHEN `validate-manifest` and `check-integrity` run
- THEN both pass with generated refs only

#### Scenario: One tag for B and C
- GIVEN B and C both merged
- WHEN the release is cut
- THEN a single `innfo-console-v*` tag covers both and no tag ships B's kit without C

#### Scenario: Shell edit requires blueprints tag
- GIVEN a shell under `bluepriNNts/**` changed
- WHEN the release batch is validated
- THEN a new `blueprints-v*` tag and repin are present

#### Scenario: Vendored copies
- GIVEN the five vendored bundle copies
- WHEN the bundle is rebuilt
- THEN each is regenerated or declared frozen
