# Delta for Base Composite Template

## MODIFIED Requirements

### Requirement: `base` Package Composition

The `base_V_0-1-0` Level-2 template is **frozen and legacy**. It SHALL remain byte-identical on disk and MUST NOT be edited. It is no longer part of ACTIVE distribution: the catalog and manifest MUST NOT advertise it, and new Level-3 models MUST NOT adopt it. For backward compatibility, existing workspaces conforming to `base_V_0-1-0` MUST still parse: `resolveTemplateSchema()` SHALL continue to compose `includes: [workspace_V_0-2-0, cogNNitive_V_0-2-0]` with the `Overview` concept (`manifest` → `workspace_V_0-2-0`, `provenance` → `cogNNitive_V_0-2-0`) exactly as before, and MUST NOT modify either included template in place.
(Previously: `base_V_0-1-0` was an ACTIVE, sanctioned composite template available for new adoption.)

#### Scenario: Frozen base template still composes both peers for legacy workspaces
- GIVEN a legacy workspace already conforming to `base_V_0-1-0`
- WHEN `resolveTemplateSchema()` composes the frozen `base_V_0-1-0` package
- THEN the resolved schema includes all concepts, fields, markers, and matrices from both `workspace_V_0-2-0` and `cogNNitive_V_0-2-0` alongside `base`'s `Overview` concept
- AND neither included template's source file is modified

#### Scenario: No composition collision between workspace and cogNNitive
- GIVEN `workspace_V_0-2-0` and `cogNNitive_V_0-2-0` define disjoint concept and field names
- WHEN `base_V_0-1-0` includes both without an `alias` map
- THEN composition succeeds with no `[COMPOSITION_COLLISION]` error

#### Scenario: Frozen base file is byte-identical and unadvertised
- GIVEN the change is applied
- WHEN the git diff of `iNNfo/specs/templates/base/base_V_0-1-0_spec_NN.md` is inspected
- THEN it is empty
- AND the file is absent from every ACTIVE `templates:` distribution list

### Requirement: Opt-In Overview-Root Entrypoint Pattern

The `*_base_NN.md` overview-root pattern is **legacy and deprecated**. A Level-3 model conforming to `base_V_0-1-0` MAY still act as the workspace's overview root for backward compatibility; when such a file is present at the workspace root, it MUST still be discovered as the primary entrypoint ahead of `workspace*.md` (per the `workspace-entrypoint` capability). New workspaces MUST NOT adopt this pattern: the canonical entry template is the fused `workspace_V_0-3-0_spec_NN.md`. Workspaces that never adopted this pattern MUST remain byte-for-byte unaffected.
(Previously: the overview-root pattern was the current opt-in entrypoint recommendation.)

#### Scenario: Legacy overview root composes manifest and provenance as children
- GIVEN `acme_base_01.md` conforming to `base_V_0-1-0` with `manifest:: [[workspace_01.md]]` and `provenance:: [[acme_cogNNitive_01.md]]`
- WHEN the legacy workspace is parsed
- THEN `workspace_01.md` and `acme_cogNNitive_01.md` both appear as children of `acme_base_01.md` in the parsed graph

#### Scenario: Adoption is opt-in and non-breaking
- GIVEN an existing workspace with only `workspace_01.md` and no `*_base_NN.md` file
- WHEN the workspace is parsed
- THEN parsing behaves identically to before this capability existed

### Requirement: `base` as the Sanctioned Composer of `workspace`

The claim that `base_V_0-1-0` is the one sanctioned composer of `workspace_V_0-2-0` via `includes` is retained as a **historical legacy note** only. Going forward, the canonical workspace entry template is the fused `workspace_V_0-3-0_spec_NN.md`, which is self-contained and MUST NOT be composed via `includes` by `base` or any other package.
(Previously: `base` was the live, sanctioned composer exception documented in `workspace_V_0-2-0_spec_NN.md`.)

#### Scenario: Legacy note documents the historical exception
- GIVEN the published note in `workspace_V_0-2-0_spec_NN.md` that no domain template `includes` it
- WHEN `base_V_0-1-0_spec_NN.md` is read
- THEN it documents that `base` was a structural exception to that note, now superseded by the fused `workspace_V_0-3-0` template

## ADDED Requirements

### Requirement: Retired Templates Move to a Frozen Distribution Partition

`scripts/template-catalog.mjs` MUST define `FROZEN_NAMES = ['cogNNitive', 'base']` and MUST emit a top-level `frozen` object in `catalog.json` while dropping those names from `templates`. `manifest/source.yaml` MUST declare a `frozen_templates:` partition holding `cogNNitive` and `base` with their file paths and `spec_version` values. `scripts/verify.js` MUST parse both `templates:` and `frozen_templates:` blocks when validating the template inventory, so the guard passes with the frozen folders still on disk. Frozen template files MUST remain byte-identical and resolvable for legacy pins. `nn-preflight` upgrade-check SHALL read only `catalog.templates`, so frozen templates get no upgrade notices.

#### Scenario: Catalog emits a frozen partition
- GIVEN `scripts/template-catalog.mjs` runs with `FROZEN_NAMES` set
- WHEN `catalog.json` is regenerated
- THEN `cogNNitive` and `base` appear under a top-level `frozen` object
- AND they are absent from `templates`

#### Scenario: Inventory guard accepts frozen folders
- GIVEN `iNNfo/specs/templates/cogNNitive/` and `iNNfo/specs/templates/base/` still on disk
- AND `manifest/source.yaml` declares them under `frozen_templates:`
- WHEN `scripts/verify.js` runs the template inventory guard
- THEN the guard passes with no missing-declaration error

#### Scenario: Frozen templates receive no upgrade notice
- GIVEN a workspace pinned to `cogNNitive_V_0-2-0_NN.md`
- WHEN `nn-preflight` upgrade-check runs
- THEN no upgrade notice is emitted for the frozen template
- AND its status is reported as `unlisted`