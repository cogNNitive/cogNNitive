# Delta for innfo-console-runtime

## MODIFIED Requirements

### Requirement: Shared UMD/IIFE Runtime

The system MUST ship a single versioned `innfo-runtime.js` as a UMD/IIFE global (`window.InnfoConsole`). The console bundle MUST also include `ui-kit.js` (`window.InnfoUI`), ordered before any module that consumes it, and MUST inject the design tokens at boot. The runtime and kit MUST NOT use `fetch()` and MUST NOT use `type=module`. They MUST be hosted on GitHub Pages and jsDelivr, with a vendored local fallback for offline use.
(Previously: the bundle composition did not include `ui-kit.js` or token injection.)

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

`innfo-console.bundle.js` MUST equal the output of `scripts/build-console-bundle.mjs` over its declared `SOURCES` (including `ui-kit.js`). A root npm script MUST run the build, and a test wired into verification MUST fail when the checked-in bundle differs from a fresh build. The build process MUST be documented.

#### Scenario: Fresh bundle passes
- GIVEN sources unchanged since the last build
- WHEN the drift test runs
- THEN it passes

#### Scenario: Stale bundle fails
- GIVEN `ui-kit.js` edited without rebuilding
- WHEN the drift test runs
- THEN it fails naming the bundle

#### Scenario: Drift test can go red
- GIVEN the checked-in bundle with one byte altered
- WHEN the drift test runs
- THEN it fails

### Requirement: Released Bundle Is Versioned

A changed bundle MUST ship under a new `innfo-console-v*` tag and new CDN file. Version references MUST be produced by `channel-refs.js` and `sync-versions.mjs`, never hand-edited. Shell edits under `bluepriNNts/**` MUST be accompanied by a `blueprints-v*` tag and re-pin in the same batch.

#### Scenario: Refs are derived
- GIVEN the release batch
- WHEN `validate-manifest` and `check-integrity` run
- THEN both pass with generated refs only

#### Scenario: Vendored copies
- GIVEN bundle copies in `metrics/samples` and `procedures/samples`
- WHEN the bundle is rebuilt
- THEN each copy is either regenerated or explicitly declared frozen (decided in design)
