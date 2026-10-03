# Release Version Generation Specification

## Purpose

Every distributed-artifact version is authored in exactly one place and read directly by manifest assembly at release time. `manifest/source.yaml` contains inventory declarations only (no `version:` fields, no `channels:` block). Versions enter the release manifest via the git tag naming the release.

## Requirements

### Requirement: Stable channel ref is derived from the pushed tag

Each stable channel ref MUST be the pushed release tag `<key>-v<version>`. `manifest/source.yaml` MUST NOT contain a `channels:` section, a stable `ref`, or any `version:` field. A release version is authored only in its single source (SKILL.md frontmatter, spec frontmatter, `innfo-mcp/package.json`, or the console `package.json`) and enters the channel by the tag that names it. Preview channel refs are the constant `main` defined in code.

#### Scenario: The tag determines the ref
- GIVEN the pushed tag `skills-v2.10.0`
- WHEN the stable manifest is assembled by the release workflow
- THEN the `skills` ref is `skills-v2.10.0` with no file hand-edited

#### Scenario: No hand-typed channel version exists
- GIVEN the repository at any commit after this change
- WHEN `manifest/source.yaml` and other tracked files are inspected
- THEN no stable channel `version`, `ref`, or `channels:` section is typed by hand

#### Scenario: A malformed tag cannot produce a ref
- GIVEN a tag whose version is not shaped `\d+\.\d+\.\d+`
- WHEN the release workflow starts
- THEN it fails before assembly rather than emitting a ref that violates `TAG_SHAPE_RE`

#### Scenario: Preview channel refs are untouched
- GIVEN preview entries whose ref is `main`
- WHEN stable assembly runs
- THEN no preview entry is modified or required to carry a version

### Requirement: Entry versions are read from their single authored source

The version of each manifest entry MUST be read from the tagged tree by one shared reader used by both manifest assembly and manifest validation: SKILL.md `version` for skills, spec `version`/`spec_version` for blueprints, `innfo-mcp/package.json` for the MCP bundle, and the console `package.json` (`iNNfo/specs/bluepriNNts/console/package.json`, `private`, outside the root workspaces) for `innfo-console`. No independently authored copy of an entry version MAY exist in `manifest/source.yaml`.

#### Scenario: A skill version bump propagates without a manual edit
- GIVEN a skill's frontmatter `version` changes
- WHEN the next release manifest is assembled
- THEN that skill's entry reflects the new value with no other file hand-edited

#### Scenario: Assembly and validation agree
- GIVEN a release manifest
- WHEN assembly and validation read an entry's version
- THEN both use the same reader and obtain the same value

#### Scenario: Console version has its own source
- GIVEN `innfo-console-v0.3.0`
- WHEN the console entry is assembled
- THEN its version is read from the console `package.json`, not from `innfo-mcp`

### Requirement: The innfo-mcp version has one authored source

With `iNNfo/packages/innfo-mcp/package.json` version as the single authored value, `innfo-core`'s version and the `@cognnitive/innfo-core` dependency range MUST remain generated from it by `sync-versions` and verified offline by `sync-versions --check` (without any `source.yaml` synchronization). The CDN `manifest.json` `latest` MUST be written by the release workflow as a release-owned file. The `innfo-mcp` ref MUST be the release tag. `checkVersionSquare`'s version-comparison logic MUST be decommissioned and its `verify.js` call site removed.

#### Scenario: Bumping the MCP package version regenerates code-coupled sites
- GIVEN the MCP `package.json` version changes `0.10.0` to `0.11.0`
- WHEN `sync-versions` runs
- THEN core's version and the dependency range read `0.11.0` unedited

#### Scenario: Release writes the CDN manifest
- GIVEN `innfo-mcp-v0.11.0` is released
- WHEN the release workflow completes
- THEN `docs/innfo/cdn/manifest.json` `latest` reads `0.11.0`
- AND the stable ref is `innfo-mcp-v0.11.0`

#### Scenario: Bundle presence is checked at release, not at verify
- GIVEN the CDN bundle is tsup output no generator can produce
- WHEN the release stages the CDN bundle
- THEN the committed bundle is copied byte-for-byte
- AND no local rebuild's bytes are compared to the committed bundle

### Requirement: Manifest generation is deterministic and backward-compatible

The stable manifest MUST be a pure function of the release tag, the content commit SHA, the tagged tree (`manifest/source.yaml` inventory and entry versions), and the previously published manifest. No timestamp, counter, or remote lookup MAY enter it. Its tag+SHA pinning shape MUST NOT change, so an existing `~/.agents/bootstrap-state.json` and an older installed `nn-preflight` keep working unmodified. Generation MUST NOT be a `--check` gate in the monorepo.

#### Scenario: Two assemblies from the same inputs are identical
- GIVEN the same tag, content commit SHA, tagged tree and previous manifest
- WHEN the manifest is assembled twice
- THEN both renders are byte-identical

#### Scenario: An older installed client still resolves the manifest
- GIVEN an `nn-preflight` installed before this change, and an existing `bootstrap-state.json`
- WHEN it fetches the generated manifest
- THEN it parses and resolves pins exactly as before

#### Scenario: Generation is not a verification gate
- GIVEN `node scripts/verify.js` in any mode
- WHEN it runs
- THEN it does not invoke manifest generation with `--check`

### Requirement: Obsolete synchronization guards are removed with their invariants accounted for

Scripts and guards whose only purpose was to keep hand-typed version copies in sync MUST be removed: `channel-refs.js`, `check-parity.js`, `tag-pin-freshness` (library, CLI, pre-push and integrity call sites), the `generate-manifest --check` and stable `validate-manifest` steps of `verify.js`, and the `source.yaml` synchronization in `sync-versions.mjs`. The `.githooks/pre-push` typecheck and `sync-versions --check` for code-coupled copies MUST be kept. Path-existence checks of `source.yaml` entries MUST be folded into the inventory guard. `freshness.js` MUST be kept as a non-blocking check moved out of the `verify` job, using the newest monorepo `<key>-v*` tag from local git as its baseline. Each removed guard MUST have its protected invariant either moved into the release workflow or dropped with a stated reason recorded in the design.

#### Scenario: Every removed guard has a disposition
- GIVEN the list of guards removed by this change
- WHEN the design is reviewed
- THEN each guard maps to a relocated invariant or a stated reason for dropping it

#### Scenario: Wrong version is still caught at release
- GIVEN a tag whose version is not greater than the highest existing tag of its key, or differs from the authored version for `innfo-mcp` or `innfo-console`
- WHEN the release workflow runs
- THEN it fails before publishing

#### Scenario: Source paths still exist
- GIVEN a `source.yaml` entry whose `path:` does not exist in the tree
- WHEN `verify.js` runs
- THEN the inventory guard fails
