# Spec: Monorepo Release Manifest

## ADDED Requirements

### Requirement: Unified Monorepo Distribution Source

All skills, templates, and MCP bundles declared in the bootstrap manifest (`manifest/source.yaml`) MUST declare `repo: cogNNitive/cogNNitive` as their repository. No asset MAY declare archived repositories (`cogNNitive/iNNfo` or `cogNNitive/actioNN`).

#### Scenario: Skills asset declaration
- GIVEN the skills section of `manifest/source.yaml`
- WHEN any skill entry (e.g. `nn-router`, `nn-innfo`, `nn-trannsform`) is inspected
- THEN its `repo:` is `cogNNitive/cogNNitive`
- AND its `path:` begins with `actioNN/skills/`

#### Scenario: Templates asset declaration
- GIVEN the templates section of `manifest/source.yaml`
- WHEN any template entry (e.g. `workspace_spec_NN`, `procedures`, `business`) is inspected
- THEN its `repo:` is `cogNNitive/cogNNitive`
- AND its `path:` begins with `iNNfo/specs/templates/`

#### Scenario: MCP bundle asset declaration
- GIVEN the embedded `mcp:` section of skill `nn-innfo` in `manifest/source.yaml`
- WHEN the `innfo-mcp` entry is inspected
- THEN its `repo:` is `cogNNitive/cogNNitive`
- AND its `path:` is `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`

### Requirement: Stable Channel Tag Provenance

For the `stable` channel, all assets MUST resolve to snapshot tags on `cogNNitive/cogNNitive` that conform to `TAG_SHAPE_RE` (`/^[a-z][a-z0-9-]*-v\d+\.\d+\.\d+$/`) and are reachable from `main`.

#### Scenario: Stable channel resolution
- GIVEN the stable channel manifest rendered in `docs/use/manifest.md`
- WHEN validated via `validate-manifest.js --channel stable`
- THEN all tags (`skills-v1.1.3`, `templates-v0.2.0`, `innfo-mcp-v0.2.4`) resolve on `cogNNitive/cogNNitive`
- AND commit provenance checks confirm reachability from `main`

### Requirement: Removal of Manifest Allowlist in CI Checker

The CI URL validation checker (`iNNfo/scripts/check-spec-version.mjs`) MUST NOT allowlist any manifest files. The entire repository, including `manifest/source.yaml`, `docs/use/manifest.md`, `docs/use/manifest-next.md`, and manifest test suites, MUST be free of residual `cogNNitive/iNNfo` references.

#### Scenario: Strict CI checker scans manifest paths
- GIVEN `npm --prefix iNNfo run check:spec-urls` is executed
- WHEN manifest paths are scanned
- THEN zero allowlisted warnings and zero legacy violations are emitted
