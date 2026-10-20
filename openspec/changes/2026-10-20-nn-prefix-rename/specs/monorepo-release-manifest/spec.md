# Delta Spec: monorepo-release-manifest

Scope guard: only the distribution prefix of the MCP and console entries changes. The `docs/innfo/` URL base, the `nn-innfo` skill name and the iNNfo term are NOT modified.

## MODIFIED Requirements

### Requirement: Unified Monorepo Distribution Source

All skills, templates, and MCP bundles declared in the bootstrap manifest (`manifest/source.yaml`) MUST declare `repo: cogNNitive/cogNNitive-web`, the public repository that mirrors the monorepo release tags. No asset MAY declare the private monorepo `cogNNitive/cogNNitive` as a pin source, nor the archived repositories (`cogNNitive`/`iNNfo` or `cogNNitive/actioNN`). Asset `path:` values MUST stay relative to the repository root with the same layout as the monorepo, because the release copies key paths verbatim. `manifest/source.yaml` MUST hold inventory only: it MUST NOT contain `version:` fields or a `channels:` section.

From the cutover slice S5 the MCP entry MUST be named `nn-mcp`, MUST use `ref_key: nn-mcp` and MUST point at `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js` (before S5 the entry keeps the name `innfo-mcp` and only its path moves, in S3b). The console entries MUST use `ref_key: nn-console` and `nn-`prefixed asset file names from S2.

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

The published stable manifest MUST NOT list `innfo-mcp` and `nn-mcp` side by side, because the skills installer registers one server per MCP entry name and two entries would register two servers with duplicated tools. The manifest MUST carry exactly one MCP entry: named `innfo-mcp` until the cutover slice S5, and named `nn-mcp` from the first `nn-mcp-v*` release onward. The same holds for the console units: each console asset appears once, under its current file name. While a unit is retained from a previous manifest, assembly MUST match the previous entry by its current OR legacy identifier (`legacy_names`, `legacy_files` in `manifest/source.yaml`) and a retained console entry MUST keep the previous `file` and `url` verbatim. The overall manifest shape (tag and SHA pins) MUST NOT change. The only place where both MCP names coexist is `freshness.json` (see `ci-subsystem-freshness-computation`), and the CDN bundle is staged under both file names (see `tag-driven-release-workflow`).

#### Scenario: Single MCP entry after the cutover
- GIVEN the manifest published by the first `nn-mcp-v*` release
- WHEN its entries are listed
- THEN `nn-mcp` is present
- AND no entry is named `innfo-mcp`

#### Scenario: Retention across the rename
- GIVEN a published manifest whose MCP entry is named `innfo-mcp`
- WHEN a `skills-v*` release is assembled before S5
- THEN the MCP entry is retained under its previous name and pin, matched through the identifier in `source.yaml`

#### Scenario: Pre-change preflight keeps working
- GIVEN a copy of `preflight-check.js` installed before this change (it hardcodes the name `innfo-mcp`)
- WHEN it runs against the S5 manifest
- THEN it raises no error and its `exitCode` is unchanged
- AND it omits only the informational MCP line, and keeps the skills and console freshness lines

#### Scenario: Pre-change skills-manager keeps working
- GIVEN a skills-manager installed before this change
- WHEN it fetches the S5 manifest
- THEN it parses and resolves pins without modification

### Requirement: Legacy identifiers are removed at the sunset

When slice S6 lands, `manifest/source.yaml` MUST stop declaring `legacy_names` and `legacy_files`, and the generated manifest MUST NOT carry a legacy `ref_key` (`innfo-mcp`, `innfo-console`). Manifests and snapshots already published remain unchanged. After S6 the manifest validator MUST reject a new manifest that still carries a legacy-named entry, while continuing to accept legacy-named tags as historical pin targets.

#### Scenario: Legacy names absent after S6
- GIVEN a manifest assembled after S6
- WHEN its entries are listed
- THEN only `nn-mcp` and `nn-console` are present
- AND no entry is named `innfo-mcp` or `innfo-console`

#### Scenario: Legacy entry rejected after S6
- GIVEN a staged manifest after S6 that still contains an `innfo-mcp` entry
- WHEN staged validation runs
- THEN it fails and names the legacy entry
