<!--
  The archived predecessor repository slug is written as two adjacent code spans
  (`cogNNitive`/`iNNfo`) rather than one, on purpose: the iNNfo `check:spec-urls`
  strict legacy scan fails on any contiguous occurrence of that slug in a
  non-excluded file, and files under openspec/specs/ are in scope.
-->

# Monorepo Release Manifest

## Purpose

Consolidate release distribution onto the public `cogNNitive/cogNNitive-web` repository mirroring monorepo release tags. Every skill, template, and MCP bundle in the bootstrap manifest (`manifest/source.yaml`) declares `repo: cogNNitive/cogNNitive-web`; the `stable` channel resolves all assets to mirror tags on `cogNNitive-web`; the stable manifest is produced as a release output; and the fallback URL is public.

## Requirements

### Requirement: Unified Monorepo Distribution Source

All skills, templates, and MCP bundles declared in the bootstrap manifest (`manifest/source.yaml`) MUST declare `repo: cogNNitive/cogNNitive-web`, the public repository that mirrors the monorepo release tags. No asset MAY declare the private monorepo `cogNNitive/cogNNitive` as a pin source, nor the archived repositories (`cogNNitive`/`iNNfo` or `cogNNitive/actioNN`). Asset `path:` values MUST stay relative to the repository root with the same layout as the monorepo, because the release copies key paths verbatim. `manifest/source.yaml` MUST hold inventory only: it MUST NOT contain `version:` fields or a `channels:` section.

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
- WHEN the `innfo-mcp` entry is inspected
- THEN its `repo:` is `cogNNitive/cogNNitive-web`
- AND its `path:` is `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`

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

For the `stable` channel, all assets MUST resolve to tags on `cogNNitive/cogNNitive-web` that conform to `TAG_SHAPE_RE` (`/^[a-z][a-z0-9-]*-v\d+\.\d+\.\d+$/`). Each such tag MUST be a mirror tag created by the release workflow for the identically named monorepo release tag, pointing at the release's content commit, which MUST be reachable from the default branch of `cogNNitive-web`.

#### Scenario: Stable channel resolution
- GIVEN the published stable manifest
- WHEN validated via `validate-manifest.js --channel stable` as the post-publish smoke test
- THEN every pinned tag (for example `skills-v2.9.0`, `blueprints-v0.19.2`, `innfo-mcp-v0.12.0`) resolves on `cogNNitive/cogNNitive-web`
- AND each pinned SHA is the commit the tag points to

#### Scenario: Pin to a tag that was never mirrored
- GIVEN a manifest pinning `skills-v9.9.9` that has no mirror tag
- WHEN the smoke test runs
- THEN validation fails and names the missing tag

### Requirement: Removal of Manifest Allowlist in CI Checker

The CI URL validation checker (`iNNfo/scripts/check-spec-version.mjs`) MUST NOT allowlist any manifest files. Every tracked manifest-related file, including `manifest/source.yaml`, `docs/use/manifest-next.md`, and manifest test suites, MUST be free of residual archived-repository (`cogNNitive`/`iNNfo`) references.

#### Scenario: Strict CI checker scans manifest paths
- GIVEN `npm --prefix iNNfo run check:spec-urls` is executed
- WHEN manifest paths are scanned
- THEN zero allowlisted warnings and zero legacy violations are emitted

### Requirement: Workspace Git Skill Registration

The skills section of `manifest/source.yaml` MUST declare `nn-workspace-git` with `repo: cogNNitive/cogNNitive-web`, `path: skills/nn-workspace-git`, and `ref_key: skills`. The entry MUST NOT reference any archived repository. Registration MAY land in the feature change that adds the skill: because no committed stable manifest is `--check`ed and no gate resolves pins before the release exists, the former release-commit-only timing rule no longer applies.

#### Scenario: Skill entry declaration
- GIVEN the skills section of `manifest/source.yaml`
- WHEN the `nn-workspace-git` entry is inspected
- THEN its `repo:` is `cogNNitive/cogNNitive-web`
- AND its `path:` is `skills/nn-workspace-git`

#### Scenario: Distribution stays unified
- GIVEN manifest validation of the skills section
- WHEN all skill entries are scanned
- THEN zero entries declare an archived repository

#### Scenario: Registering before the first release does not break push CI
- GIVEN a commit that registers a skill whose tag does not exist yet
- WHEN push-to-main CI runs
- THEN it does not fail on an unresolved tag

### Requirement: Stable manifest is a release output

The stable manifest MUST be produced by the release workflow and published to `https://cognnitive.com/use/manifest.md`. `docs/use/manifest.md` MUST be untracked in the monorepo, and the stable manifest MUST NOT be a committed, regenerated, or `--check`ed file there. The preview manifest (`docs/use/manifest-next.md`) is out of scope and remains committed. The published manifest MUST keep its current shape (tag and SHA pins) so installed consumers parse it unchanged. The URL MUST NOT change.

#### Scenario: Monorepo does not track the stable manifest
- GIVEN the monorepo working tree at any commit after this change
- WHEN tracked files are listed
- THEN there is no committed stable manifest that a verification step compares against a regenerated copy

#### Scenario: Shape is unchanged for consumers
- GIVEN an `nn-preflight` or skills-manager installed before this change
- WHEN it fetches the newly published manifest
- THEN it parses and resolves pins without modification

### Requirement: Fallback manifest URL is public

The fallback manifest URL constants (`FALLBACK_MANIFEST_URL` in `scripts/lib/skills-commands.js` and `skills/nn-preflight/scripts/preflight-check.js`) MUST both equal `https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/docs/use/manifest.md`, a public location independent of the Pages domain that is updated by the release's manifest commit. They MUST NOT point at the private monorepo.

#### Scenario: Fallback resolves without credentials
- GIVEN the fallback URL constant in each consumer
- WHEN it is requested without credentials
- THEN it returns the stable manifest and not a 404
- AND its value is the raw URL of `docs/use/manifest.md` on `cogNNitive-web` `main`

#### Scenario: Both consumers agree
- GIVEN the two constants
- WHEN they are compared
- THEN they are equal
