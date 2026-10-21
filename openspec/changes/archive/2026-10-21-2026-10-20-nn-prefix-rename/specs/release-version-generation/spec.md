# Delta Spec: release-version-generation

Scope guard: only the distribution prefix changes (`innfo-*` to `nn-*` for the workspace packages, directories and release keys). Internal identifiers such as `__INNFO_MCP_VERSION__` and `INNFO_*` environment variables are out of scope and MUST NOT be renamed by any requirement here.

## MODIFIED Requirements

### Requirement: Stable channel ref is derived from the pushed tag

Each stable channel ref MUST be the pushed release tag `<key>-v<version>`. `manifest/source.yaml` MUST NOT contain a `channels:` section, a stable `ref`, or any `version:` field. A release version is authored only in its single source (SKILL.md frontmatter, spec frontmatter, `nn-mcp/package.json`, or the console `package.json`) and enters the channel by the tag that names it. Preview channel refs are the constant `main` defined in code.

(Previously: the MCP authored source was `innfo-mcp/package.json`.)

#### Scenario: The tag determines the ref
- GIVEN the pushed tag `skills-v2.10.0`
- WHEN the stable manifest is assembled by the release workflow
- THEN the `skills` ref is `skills-v2.10.0` with no file hand-edited

#### Scenario: The MCP tag determines the nn-mcp ref
- GIVEN the pushed tag `nn-mcp-v0.30.0`
- WHEN the stable manifest is assembled by the release workflow
- THEN the `nn-mcp` ref is `nn-mcp-v0.30.0` with no file hand-edited

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

The version of each manifest entry MUST be read from the tagged tree by one shared reader used by both manifest assembly and manifest validation: SKILL.md `version` for skills, spec `version`/`spec_version` for blueprints, `nn-mcp/package.json` for the MCP bundle, and the console `package.json` (`iNNfo/specs/bluepriNNts/console/package.json`, `private`, outside the root workspaces) for `nn-console`. No independently authored copy of an entry version MAY exist in `manifest/source.yaml`. The reader resolves only the `nn-*` keys.

(Previously: the sources were `innfo-mcp/package.json` and the `innfo-console` key.)

#### Scenario: A skill version bump propagates without a manual edit
- GIVEN a skill's frontmatter `version` changes
- WHEN the next release manifest is assembled
- THEN that skill's entry reflects the new value with no other file hand-edited

#### Scenario: Assembly and validation agree
- GIVEN a release manifest
- WHEN assembly and validation read an entry's version
- THEN both use the same reader and obtain the same value

#### Scenario: Console version has its own source
- GIVEN `nn-console-v0.8.0`
- WHEN the console entry is assembled
- THEN its version is read from the console `package.json`, not from `nn-mcp`

### Requirement: The nn-mcp version has one authored source

With `iNNfo/packages/nn-mcp/package.json` version as the single authored value, `nn-core`'s version and the `@cognnitive/nn-core` dependency range MUST remain generated from it by `sync-versions` and verified offline by `sync-versions --check` (without any `source.yaml` synchronization). After PR 1 the workspace packages MUST be named `@cognnitive/nn-core`, `@cognnitive/nn-mcp` and `@cognnitive/nn-console`, their directories MUST be `iNNfo/packages/nn-core` and `iNNfo/packages/nn-mcp`, and `sync-versions` MUST read and write only those paths and names. The CDN `manifest.json` `latest` MUST be written by the release workflow as a release-owned file. The `nn-mcp` ref MUST be the release tag. `checkVersionSquare`'s version-comparison logic MUST be decommissioned and its `verify.js` call site removed.

The workspace packages are workspace-only (not published to an npm registry, root `package.json` is `private`); no npm deprecation step is required.

(Previously: the single authored value was `iNNfo/packages/innfo-mcp/package.json` and the generated range was `@cognnitive/innfo-core`.)

#### Scenario: Bumping the MCP package version regenerates code-coupled sites
- GIVEN the `nn-mcp` `package.json` version changes `0.30.0` to `0.31.0`
- WHEN `sync-versions` runs
- THEN `nn-core`'s version and the `@cognnitive/nn-core` dependency range read `0.31.0` unedited

#### Scenario: Release writes the CDN manifest
- GIVEN `nn-mcp-v0.31.0` is released
- WHEN the release workflow completes
- THEN `docs/innfo/cdn/manifest.json` `latest` reads `0.31.0`
- AND the stable ref is `nn-mcp-v0.31.0`

#### Scenario: Bundle presence is checked at release, not at verify
- GIVEN the CDN bundle is tsup output no generator can produce
- WHEN the release stages the CDN bundle
- THEN the committed bundle is copied byte-for-byte
- AND no local rebuild's bytes are compared to the committed bundle

#### Scenario: Old package names are gone after the rename
- GIVEN the repository after PR 1
- WHEN the root `workspaces` glob, every workspace `package.json` and `package-lock.json` are inspected
- THEN no `@cognnitive/innfo-core`, `@cognnitive/innfo-mcp` or `@cognnitive/innfo-console` name or dependency range remains
- AND `package-lock.json` is consistent with `package.json` so `npm ci` succeeds

#### Scenario: Directory rename preserves history
- GIVEN PR 1 is applied
- WHEN `iNNfo/packages/nn-core` and `iNNfo/packages/nn-mcp` are inspected
- THEN they contain the former `innfo-core` and `innfo-mcp` contents
- AND no `iNNfo/packages/innfo-*` directory exists

### Requirement: Obsolete synchronization guards are removed with their invariants accounted for

Scripts and guards whose only purpose was to keep hand-typed version copies in sync MUST be removed: `channel-refs.js`, `check-parity.js`, `tag-pin-freshness` (library, CLI, pre-push and integrity call sites), the `generate-manifest --check` and stable `validate-manifest` steps of `verify.js`, and the `source.yaml` synchronization in `sync-versions.mjs`. The `.githooks/pre-push` typecheck and `sync-versions --check` for code-coupled copies MUST be kept. Path-existence checks of `source.yaml` entries MUST be folded into the inventory guard. `freshness.js` MUST be kept as a non-blocking check moved out of the `verify` job, using the newest monorepo `<key>-v*` tag from local git as its baseline. Each removed guard MUST have its protected invariant either moved into the release workflow or dropped with a stated reason recorded in the design.

(Previously: the second scenario named `innfo-mcp` and `innfo-console` as the keys with an authored version.)

#### Scenario: Every removed guard has a disposition
- GIVEN the list of guards removed by this change
- WHEN the design is reviewed
- THEN each guard maps to a relocated invariant or a stated reason for dropping it

#### Scenario: Wrong version is still caught at release
- GIVEN a tag whose version is not greater than the highest existing tag of its key, or differs from the authored version for `nn-mcp` or `nn-console`
- WHEN the release workflow runs
- THEN it fails before publishing

#### Scenario: Source paths still exist
- GIVEN a `source.yaml` entry whose `path:` does not exist in the tree
- WHEN `verify.js` runs
- THEN the inventory guard fails

## RENAMED Requirements

- FROM: `### Requirement: The innfo-mcp version has one authored source`
- TO: `### Requirement: The nn-mcp version has one authored source`

## ADDED Requirements

### Requirement: Generated and wrapper file names use the nn prefix

From PR 1 (generated core files), PR 2 (console files) and PR 3 (wrappers and docs), files whose names embed the distribution prefix MUST use `nn-`: the generated core files (`nn-core.generated.cjs` in each skill that vendors it, and the other generated files that carried the `innfo-` prefix in their file name) and the three `docs/innfo/documentation/innfo-*.md` file names (the `docs/innfo/` URL base itself is kept). The MCP wrapper scripts are `scripts/nn-mcp.{sh,ps1,cmd}`; the former `scripts/innfo-mcp.{sh,ps1,cmd}` and the `innfo-mcp.bundle.js` bin entry are deleted in PR 3. Generators, guards and tests that reference these files MUST use the new names. The generated file contents MUST be regenerated by the existing generators, never hand-edited. Internal identifiers inside the files (for example the `InnfoSlug` global) are out of scope and MUST remain unchanged.

#### Scenario: Generated core file renamed
- GIVEN the skills that vendor the core bundle
- WHEN `skills/*/scripts/lib/` is listed after PR 1
- THEN `nn-core.generated.cjs` exists where `innfo-core.generated.cjs` existed
- AND the regeneration command produces it byte-identically

#### Scenario: Internal identifiers untouched
- GIVEN the regenerated `*.generated.*` files
- WHEN they are searched for `InnfoSlug`, `InnfoConsole` and `__INNFO_MCP_VERSION__`
- THEN those identifiers are still present and unchanged
