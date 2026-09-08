# Delta for Workspace Template Upgrade Flow

## MODIFIED Requirements

### Requirement: Template Catalog Artifact

A Level-2 template catalog MUST exist as a committed, machine-readable JSON file at
`iNNfo/specs/templates/catalog.json`. For every canonical template discovered in the
`iNNfo/specs/templates/` tree, the catalog MUST record:

- `name` — the canonical template name (e.g. `business`, `workspace`, `documentation`).
- `versions` — the published immutable versions found on disk, each with its
  `template_version` and the exact `spec_url` used to pin a model to it.
- `adopted` — the published version with the highest `template_version`; this is the
  version a workspace upgrade targets.

The catalog MUST be produced by a deterministic generator
(`scripts/template-catalog.mjs`). The generator MUST exit non-zero with a drift report
when invoked with `--check` and the committed `catalog.json` is stale, so the artifact
cannot silently rot. The catalog MUST NOT include local/specialization templates that are
not canonical (they are never an upgrade target).

The catalog MUST additionally be resolvable from a canonical, publicly reachable remote
URL, not only from the in-repo file, so that non-monorepo workspaces and the browser
editor can classify template versions. Consumers MUST resolve the catalog by trying the
canonical remote URL and falling back to any in-repo copy; when neither resolves,
classification MUST degrade to `offline` rather than fail.
(Previously: the catalog was specified only as a committed in-repo file, with no canonical
remote resolution path for external workspaces or the browser.)

#### Scenario: Generator produces and validates the catalog
- GIVEN the canonical templates `business_V_0-2-0`, `business_V_0-1-0` in the specs tree
- WHEN `scripts/template-catalog.mjs` runs without `--check`
- THEN it writes `catalog.json` where `business.versions` contains both versions
- AND `business.adopted == "V_0-2-0"`

#### Scenario: Drift is detected
- GIVEN a committed `catalog.json` that is missing a newly added template version
- WHEN `scripts/template-catalog.mjs --check` runs
- THEN it exits non-zero and reports the stale entries

#### Scenario: Catalog resolves from the canonical remote URL
- GIVEN a workspace outside the monorepo with no in-repo `catalog.json`
- WHEN a consumer resolves the catalog
- THEN it fetches the canonical remote URL and classifies template versions from it

#### Scenario: Catalog unreachable degrades to offline
- GIVEN neither the canonical remote URL nor an in-repo copy is reachable
- WHEN a consumer resolves the catalog
- THEN classification degrades to an `offline` result and does not fail the caller

### Requirement: Tier-3 Upgrade Detection Scan

The template-version classification vocabulary and the bump-gap computation MUST be
implemented once as a platform-neutral primitive in `innfo-core` (pure functions: no
`fs`, no `require`, and no network of their own — remote data such as the catalog is
passed in). The preflight CLI (`upgrade-check.js` / `preflight-check.js --workspace-dir`),
`innfo-mcp`, and `innfo-editor` MUST all classify template versions through this single
implementation and MUST NOT keep a private copy.

Classification of a Level-3 model against the catalog's `adopted` version MUST yield one
of:

- `current` — the model's template version equals the catalog `adopted` version.
- `upgrade-available` — a newer published version exists and is the `adopted` version;
  the bump gap (`major` / `minor` / `patch` per `defiNNe` §7) MUST be reported.
- `ahead` — the model is pinned to a published version newer than the catalog `adopted`
  version.
- `unlisted` — the template is not in the catalog (e.g. a local specialization).
- `unpinned` — the model has no resolvable pinned template version to classify.

When classification runs in the preflight runner (`preflight-check.js --workspace-dir`),
discovery MUST cover all Level-3 models in the workspace (from `models/` and the workspace
root), read each model's `parent_spec.url` (or `spec_url`), and match the template
basename against the resolved catalog. The detection scan MUST be non-mutating and MUST
NOT flip the preflight exit code to a blocker. An available upgrade SHALL be reported as
an informational/actionable item, not a blocker. `unlisted` and `unpinned` are
informational states, not failures. If the catalog cannot be resolved, the scan MUST
degrade to an `offline` notice rather than fail the run.
(Previously: classification lived only in CLI-only CommonJS code in `upgrade-check.js`,
the vocabulary omitted `unpinned`, and no shared platform-neutral `innfo-core` primitive
existed for the MCP or the browser to reuse.)

#### Scenario: Model is current
- GIVEN a workspace model pinned to the catalog `adopted` version of `business`
- WHEN the Tier-3 scan runs
- THEN the model is classified `current`
- AND no upgrade is offered

#### Scenario: Model has an upgrade available
- GIVEN a workspace model pinned to `business_V_0-1-0`
- AND the catalog `adopted` version of `business` is `V_0-2-0`
- WHEN the Tier-3 scan runs
- THEN the model is classified `upgrade-available`
- AND the gap is reported as `minor`
- AND the preflight exit code stays `0`

#### Scenario: Catalog is offline
- GIVEN a workspace whose catalog cannot be resolved
- WHEN the Tier-3 scan runs
- THEN the scan reports an `offline` notice
- AND does not classify models as upgrade-available or current

#### Scenario: Shared primitive gives identical results across surfaces
- GIVEN the same model, catalog, and pinned version
- WHEN classification runs from `upgrade-check.js`, from `innfo-mcp`, and from `innfo-editor`
- THEN all three return the same `versionStatus` and `gap`

#### Scenario: Model without a resolvable pinned version
- GIVEN a workspace model whose `parent_spec.url` / `spec_url` yields no pinnable version
- WHEN the Tier-3 scan runs
- THEN the model is classified `unpinned`
- AND it is reported as informational, not as a blocker
