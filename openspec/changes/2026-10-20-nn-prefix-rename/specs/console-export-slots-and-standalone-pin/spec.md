# Delta Spec: console-export-slots-and-standalone-pin

Scope guard: only the console distribution file names and the CDN shell pin change. The embedded JSON slot ids `innfo-config`, `innfo-schema` and `innfo-model` are internal identifiers and MUST NOT be renamed by any requirement here, because older stamped exports carry them.

## MODIFIED Requirements

### Requirement: Standalone Exporter Single-File Execution Contract (R-EXP-02)
`scripts/export-console.mjs` MUST be runnable as a standalone CLI script given access only to the model workspace and the vendored console assets (`blueprint.html`, `nn-console.bundle.js`, `console-payload.generated.cjs`), without requiring `scripts/lib/*` or `manifest/source.yaml`. The payload mirror MUST be resolved from the same `consoleDir` as the shell and bundle and MUST ship as a `console_assets` entry. The exporter MUST use `nn-console.bundle.js` and MUST NOT fall back to any `innfo-console.bundle.js`.
(Previously: the vendored bundle was `innfo-console.bundle.js`.)

#### Scenario: Running export-console in workspace-only environment
- GIVEN a directory containing only `export-console.mjs`, `blueprint.html`, `nn-console.bundle.js` and `console-payload.generated.cjs`
- WHEN invoked against a valid Level 3 model workspace
- THEN it MUST successfully export the console HTML without throwing module-resolution errors.

#### Scenario: Mirror omitted from the asset set
- GIVEN the same directory without `console-payload.generated.cjs`
- WHEN invoked
- THEN it MUST fail loudly rather than export with a different payload builder

#### Scenario: Legacy-named bundle is not used
- GIVEN a directory with only `innfo-console.bundle.js` (plus shell and mirror)
- WHEN invoked
- THEN it MUST fail loudly naming `nn-console.bundle.js` as the missing asset

## ADDED Requirements

### Requirement: Standalone shell pins the nn-console CDN tag

From PR 2, generated and synced console shells MUST pin the CDN bundle with the pin `@nn-console-v<version>` (for example `cdn.jsdelivr.net/gh/cogNNitive/cogNNitive-web@nn-console-v0.8.0/...`). `console-shell-sync.js`, `console-shell-guard.js` and `export-console.mjs` MUST generate and verify that form. Every shell under `bluepriNNts/**` MUST pin the current `nn-console` tag after the first `nn-console-v*` release.

#### Scenario: Synced shell pins the new tag
- GIVEN the first `nn-console-v0.8.0` release and a shell sync
- WHEN the shells are inspected
- THEN each pins `@nn-console-v0.8.0` and none pins an `@innfo-console-v` tag

#### Scenario: Exporter emits the new pin
- GIVEN `export-console.mjs` run in default CDN-pinned mode
- WHEN the output HTML is inspected
- THEN its bundle URL contains `@nn-console-v` followed by the console version

### Requirement: Repo shells are strict; readers accept legacy pins for reading only

After PR 2 `console-shell-guard.js` MUST reject a repo shell that pins `@innfo-console-v`, and nothing MUST emit that pin. Readers (`getGeneratedPin` in `console-release-info.js`, the `console-shell-sync.js` pin regex and the `export-console.mjs` re-pin) MUST accept `(?:nn|innfo)-console` so stamped exports pinned to `@innfo-console-vX` keep parsing. The re-pin MUST rewrite a stamped `@innfo-console-v<semver>/.../innfo-console.bundle.js` to the `nn-console` ref and file name. Published tags and CDN files under the former name MUST NOT be removed, so previously stamped exports keep resolving.

#### Scenario: Repo shell with the legacy pin is rejected
- GIVEN a repo shell pinned `@innfo-console-v0.7.0`
- WHEN `console-shell-guard.js` runs
- THEN it fails and names the shell

#### Scenario: Stamped export with the legacy pin stays readable
- GIVEN a stamped export pinned `@innfo-console-v0.7.0`
- WHEN the tooling reads it
- THEN it is parsed without error and its CDN URL still serves

#### Scenario: Re-pin rewrites a stamped export
- GIVEN a stamped export pinned `@innfo-console-v0.20.0/.../innfo-console.bundle.js`
- WHEN `export-console.mjs` re-pins it
- THEN the result pins the `nn-console` ref and `nn-console.bundle.js`

#### Scenario: Malformed pin is rejected
- GIVEN a shell pinned `@nn-console-v0.8` (not `\d+\.\d+\.\d+`)
- WHEN the guard runs
- THEN it fails

### Requirement: Embedded slot ids are not part of the rename

The exporter MUST keep emitting the slots `innfo-config`, `innfo-schema` and `innfo-model` unchanged in every PR. No PR MAY rename, alias or duplicate them.

#### Scenario: Slot ids unchanged
- GIVEN a console exported after PR 2
- WHEN its slots are listed
- THEN they are `innfo-config`, `innfo-schema` and `innfo-model` and no `nn-config`, `nn-schema` or `nn-model` slot exists
