# Delta Spec: console-export-slots-and-standalone-pin

Scope guard: only the console distribution file names and the CDN shell pin change. The embedded JSON slot ids `innfo-config`, `innfo-schema` and `innfo-model` are internal identifiers and MUST NOT be renamed by any requirement here, because older stamped exports carry them.

## MODIFIED Requirements

### Requirement: Standalone Exporter Single-File Execution Contract (R-EXP-02)
`scripts/export-console.mjs` MUST be runnable as a standalone CLI script given access only to the model workspace and the vendored console assets (`blueprint.html`, `nn-console.bundle.js`, `console-payload.generated.cjs`), without requiring `scripts/lib/*` or `manifest/source.yaml`. The payload mirror MUST be resolved from the same `consoleDir` as the shell and bundle and MUST ship as a `console_assets` entry. The exporter MUST prefer `nn-console.bundle.js`; while the transition window is open (S2 until S6 lands) it MUST fall back to `innfo-console.bundle.js` when only that file is present, and after S6 it MUST NOT.
(Previously: the vendored bundle was `innfo-console.bundle.js` and the exporter had no name fallback.)

#### Scenario: Running export-console in workspace-only environment
- GIVEN a directory containing only `export-console.mjs`, `blueprint.html`, `nn-console.bundle.js` and `console-payload.generated.cjs`
- WHEN invoked against a valid Level 3 model workspace
- THEN it MUST successfully export the console HTML without throwing module-resolution errors.

#### Scenario: Mirror omitted from the asset set
- GIVEN the same directory without `console-payload.generated.cjs`
- WHEN invoked
- THEN it MUST fail loudly rather than export with a different payload builder

#### Scenario: Legacy-named bundle during the window
- GIVEN the window is open and a directory with only `innfo-console.bundle.js` (plus shell and mirror)
- WHEN invoked
- THEN it MUST export successfully using that bundle

#### Scenario: Legacy-named bundle after the sunset
- GIVEN the post-S6 exporter and a directory with only `innfo-console.bundle.js`
- WHEN invoked
- THEN it MUST fail loudly naming `nn-console.bundle.js` as the missing asset

## ADDED Requirements

### Requirement: Standalone shell pins the nn-console CDN tag

From slice S2, generated and synced console shells MUST pin the CDN bundle with the pin `@nn-console-v<version>` (for example `cdn.jsdelivr.net/gh/cogNNitive/cogNNitive-web@nn-console-v0.8.0/...`). `console-shell-sync.js`, `console-shell-guard.js` and `export-console.mjs` MUST generate and verify that form. Every shell under `bluepriNNts/**` MUST pin the current `nn-console` tag after the first `nn-console-v*` release.

#### Scenario: Synced shell pins the new tag
- GIVEN the first `nn-console-v0.8.0` release and a shell sync
- WHEN the shells are inspected
- THEN each pins `@nn-console-v0.8.0` and none pins an `@innfo-console-v` tag

#### Scenario: Exporter emits the new pin
- GIVEN `export-console.mjs` run in default CDN-pinned mode
- WHEN the output HTML is inspected
- THEN its bundle URL contains `@nn-console-v` followed by the console version

### Requirement: Guards accept both pins during the window and only the new pin for live shells afterwards

While the transition window is open (S2 until S6 lands) the shell-pin regexes in `console-shell-sync.js` (`JSDELIVR_PIN_RE`), `console-shell-guard.js` and `export-console.mjs` MUST accept both `@nn-console-v<semver>` and `@innfo-console-v<semver>`, so stamped exports and not-yet-synced shells keep validating. After S6 the guards MUST reject a live shell carrying `@innfo-console-v` and MUST still be able to read a stamped export carrying it without failing on that export alone. Published tags and CDN files under the legacy name MUST NOT be removed, so previously stamped exports keep resolving.

#### Scenario: Both pins pass during the window
- GIVEN the window is open and two shells, one pinned `@nn-console-v0.8.0` and one pinned `@innfo-console-v0.7.0`
- WHEN `console-shell-guard.js` runs
- THEN neither shell fails the pin check

#### Scenario: Live shell with the legacy pin after the sunset
- GIVEN the post-S6 guard and a live shell pinned `@innfo-console-v0.7.0`
- WHEN the guard runs
- THEN it fails and names the shell

#### Scenario: Stamped export with the legacy pin stays readable
- GIVEN a stamped export pinned `@innfo-console-v0.7.0`
- WHEN the post-S6 tooling reads it
- THEN it is parsed without error and its CDN URL still serves

#### Scenario: Malformed pin is rejected
- GIVEN a shell pinned `@nn-console-v0.8` (not `\d+\.\d+\.\d+`)
- WHEN the guard runs
- THEN it fails

### Requirement: Embedded slot ids are not part of the rename

The exporter MUST keep emitting the slots `innfo-config`, `innfo-schema` and `innfo-model` unchanged after every slice. No slice MAY rename, alias or duplicate them.

#### Scenario: Slot ids unchanged
- GIVEN a console exported after S6
- WHEN its slots are listed
- THEN they are `innfo-config`, `innfo-schema` and `innfo-model` and no `nn-config`, `nn-schema` or `nn-model` slot exists
