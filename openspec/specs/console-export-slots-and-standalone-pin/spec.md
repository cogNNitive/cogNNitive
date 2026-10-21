# Spec: Console Export JSON Slot Escaping and Standalone CDN Pinning

## Purpose
Defines how the console exporter emits embedded JSON slots verbatim, runs as a standalone script, and ships on its own release channels.
## Requirements
### Requirement: Verbatim Model JSON Slot Emission (R-EXP-01)
`scripts/export-console.mjs` MUST emit all embedded JSON script slots (`innfo-config`, `innfo-schema`, `innfo-model`) verbatim without interpreting `$` character sequences (`$1`, `$2`, `$&`, `$$`) in model content as capture group replacement patterns.

#### Scenario: Exporting model containing currency and dollar patterns
- GIVEN a Level 3 iNNfo model containing fields with `$1M`, `$250`, or regex dollar characters
- WHEN `export-console.mjs` compiles the model to HTML
- THEN the `innfo-model` script slot in the generated HTML MUST be valid JSON containing the literal `$1M` and `$250` strings
- AND `JSON.parse()` of the slot content MUST succeed without error.

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

### Requirement: Release Channels Carry the Change

The change MUST ship on its own tags, bumping versions verified in `manifest/source.yaml` at release time (expected: `innfo-console` 0.7.0, `blueprints` 0.20.0, `skills` 2.9.0, `innfo-mcp` 0.13.0). The mirror MUST be a `console_assets` entry; shells MUST pin the new console tag; `blueprint_version` MUST be bumped on every edited or deleted procedure. Refs MUST come from `sync-versions.mjs`/`channel-refs.js`, never by hand, and a published bundle MUST NOT be overwritten.

#### Scenario: Integrity after release prep

- GIVEN the bumped manifest and shells
- WHEN `check-integrity.js` and the `--release` rehearsal run
- THEN both pass and every shell pins the new console tag

#### Scenario: Mirror listed

- GIVEN `manifest/source.yaml`
- WHEN `console_assets` is read
- THEN it includes `console/console-payload.generated.cjs`

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

