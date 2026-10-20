# Delta Spec: monorepo-release-manifest

Scope guard: only the distribution prefix of the MCP and console entries changes. The `docs/innfo/` URL base, the `nn-innfo` skill name and the iNNfo term are NOT modified.

## MODIFIED Requirements

### Requirement: Unified Monorepo Distribution Source

All skills, templates, and MCP bundles declared in the bootstrap manifest (`manifest/source.yaml`) MUST declare `repo: cogNNitive/cogNNitive-web`, the public repository that mirrors the monorepo release tags. No asset MAY declare the private monorepo `cogNNitive/cogNNitive` as a pin source, nor the archived repositories (`cogNNitive`/`iNNfo` or `cogNNitive/actioNN`). Asset `path:` values MUST stay relative to the repository root with the same layout as the monorepo, because the release copies key paths verbatim. `manifest/source.yaml` MUST hold inventory only: it MUST NOT contain `version:` fields or a `channels:` section.

From PR 3 the MCP entry MUST be named `nn-mcp`, MUST use `ref_key: nn-mcp` and MUST point at `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js` (PR 1 moves only the path; the name changes once, in PR 3, together with `Server({name:'nn-mcp'})`). The console entries MUST use `ref_key: nn-console` and `nn-`prefixed asset file names from PR 2.

(Previously: the MCP entry was named `innfo-mcp` with path `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`.)

#### Scenario: Skills asset declaration
- GIVEN the skills section of `manifest/source.yaml`
- WHEN any skill entry (e.g. `nn-router`, `nn-innfo`, `nn-trannsform`) is inspected
- THEN its `repo:` is `cogNNitive/cogNNitive-web`
- AND its `path:` begins with `skills/`

#### Scenario: Templates asset declaration
- GIVEN the templates section of `manifest/source.yaml`
- WHEN any template entry (e.g. `workspace_spec_NN`, `procedures`, `business`) is inspected
- THEN its `repo:` is `cogNNitive/cogNNitive-web`
- AND its `path:` begins with `iNNfo/specs/`

#### Scenario: MCP bundle asset declaration
- GIVEN the embedded `mcp:` section of skill `nn-innfo` in `manifest/source.yaml`
- WHEN the `nn-mcp` entry is inspected
- THEN its `repo:` is `cogNNitive/cogNNitive-web`
- AND its `path:` is `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js`
- AND its `ref_key` is `nn-mcp`

#### Scenario: Console asset declaration
- GIVEN the `console_assets` entries of `manifest/source.yaml`
- WHEN each is inspected
- THEN its `ref_key` is `nn-console`
- AND its file name carries the `nn-` prefix and not `innfo-`

#### Scenario: Source inventory carries no versions or channels
- GIVEN `manifest/source.yaml`
- WHEN it is inspected
- THEN it contains no `version:` field and no `channels:` section

#### Scenario: No archived or private pin source
- GIVEN all entries in `manifest/source.yaml`
- WHEN their `repo:` values are scanned
- THEN none is an archived repository
- AND none is the private monorepo

### Requirement: Stable Channel Tag Provenance

For the `stable` channel, all assets MUST resolve to tags on `cogNNitive/cogNNitive-web` that conform to `TAG_SHAPE_RE` (`/^[a-z][a-z0-9-]*-v\d+\.\d+\.\d+$/`). Each such tag MUST be a mirror tag created by the release workflow for the identically named monorepo release tag, pointing at the release's content commit, which MUST be reachable from the default branch of `cogNNitive-web`. Legacy-named mirror tags (`innfo-mcp-v*`, `innfo-console-v*`) conform to the same shape and MUST remain valid pin targets for historical manifests and snapshots.

#### Scenario: Stable channel resolution
- GIVEN the published stable manifest
- WHEN validated via `validate-manifest.js --channel stable` as the post-publish smoke test
- THEN every pinned tag (for example `skills-v2.9.0`, `blueprints-v0.19.2`, `nn-mcp-v0.30.0`) resolves on `cogNNitive/cogNNitive-web`
- AND each pinned SHA is the commit the tag points to

#### Scenario: Pin to a tag that was never mirrored
- GIVEN a manifest pinning `skills-v9.9.9` that has no mirror tag
- WHEN the smoke test runs
- THEN validation fails and names the missing tag

#### Scenario: Legacy tag as a pin target
- GIVEN a historical manifest pinning `innfo-mcp-v0.29.0`
- WHEN it is validated
- THEN the tag resolves and the shape check passes

## ADDED Requirements

### Requirement: The MCP entry switches name once, with no side-by-side entries

The published stable manifest MUST NOT list `innfo-mcp` and `nn-mcp` side by side, because the skills installer registers one server per MCP entry name and two entries would register two servers with duplicated tools. The manifest MUST carry exactly one MCP entry, named `nn-mcp` from the first `nn-mcp-v*` release onward (the first release after PR 3, with a version strictly greater than the highest `innfo-mcp-v*` tag). Each console asset appears once, under its `nn-` file name. `manifest/source.yaml` MUST NOT declare `legacy_names` or `legacy_files`. To retain pins from the last published `innfo-*` manifest, `scripts/release/assemble-manifest.js` MAY carry a transient `PREVIOUS_PIN_RENAMES` map, consulted only when the previous manifest has no entry under the new name; a retained console entry MUST keep the previous `file` and `url` verbatim. The map is code, never part of a published manifest, and is deleted in the cleanup commit. The overall manifest shape (tag and SHA pins) MUST NOT change.

#### Scenario: Single MCP entry after the cutover
- GIVEN the manifest published by the first `nn-mcp-v*` release
- WHEN its entries are listed
- THEN `nn-mcp` is present
- AND no entry is named `innfo-mcp`

#### Scenario: Retention across the rename
- GIVEN a previous published manifest whose MCP entry is named `innfo-mcp` pinned at `innfo-mcp-v0.29.0`
- WHEN a `skills-v*` release is assembled after PR 2
- THEN the MCP pin is retained under the name `nn-mcp` through `PREVIOUS_PIN_RENAMES`
- AND the assembler does not throw `requirePin`

#### Scenario: Console entry retained verbatim
- GIVEN a previous manifest with a console asset under its `innfo-` file name
- WHEN a non-console release is assembled
- THEN the retained entry keeps the previous `file` and `url` unchanged

#### Scenario: No legacy fields in source
- GIVEN `manifest/source.yaml`
- WHEN it is scanned
- THEN it contains no `legacy_names` or `legacy_files`

### Requirement: The transient pin-rename map is removed in the cleanup commit

In the cleanup commit that follows the first `nn-*` releases, `PREVIOUS_PIN_RENAMES` and its tests MUST be deleted. The generated manifest MUST NOT carry a legacy `ref_key` (`innfo-mcp`, `innfo-console`), and the manifest validator MUST reject a new manifest that carries a legacy-named entry, while continuing to accept legacy-named tags as historical pin targets. Manifests and snapshots already published remain unchanged.

#### Scenario: Map deleted
- GIVEN the repository after the cleanup commit
- WHEN `scripts/release/assemble-manifest.js` is scanned
- THEN `PREVIOUS_PIN_RENAMES` does not exist

#### Scenario: Legacy entry rejected
- GIVEN a staged manifest after the cleanup commit that still contains an `innfo-mcp` entry
- WHEN staged validation runs
- THEN it fails and names the legacy entry