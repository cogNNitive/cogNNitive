# Delta for Base Composite Template

Decision D13: the legacy `base` bluepriNNt is DELETED in this change (folder `iNNfo/specs/bluepriNNts/base/` with its spec and samples, its `manifest/source.yaml` entry, its tests and fixtures, and every live reference). `base` composes the frozen `workspace_V_0-2-0` and `cogNNitive_V_0-2-0`, which carry Marker Definitions, so it could only ever fail `MARKERS_REMOVED` with no possible fix. Write-once published files that mention it (`iNNfo_V_0-3-0`, `iNNfo_V_0-4-0`, the frozen `workspace_V_0-2-0` and `cogNNitive_V_0-2-0` specs) are NOT edited. `MARKERS_REMOVED` stays version-agnostic.

## REMOVED Requirements

### Requirement: `base` Package Composition

(Reason: the `base` bluepriNNt is deleted (D13). Its frozen peers declare Marker Definitions, so the package cannot validate under `MARKERS_REMOVED`.)
(Migration: none. Only the legacy `base` sample used it, and it is deleted with it. Domains use the fused `workspace_V_0-3-0` or later entry template.)

### Requirement: Opt-In Overview-Root Entrypoint Pattern

(Reason: the `*_base_NN.md` overview-root pattern was already legacy and deprecated; with the `base` bluepriNNt deleted, no model can conform to it and the entrypoint discovery rule for it has no consumer.)
(Migration: none. `domaiNN/spec_NN.md` already states `*_base_NN.md` entrypoints are not loaded by current tooling.)

### Requirement: `base` as the Sanctioned Composer of `workspace`

(Reason: the historical legacy note described the `base` exception; `base` no longer exists. The published note inside the frozen `workspace_V_0-2-0` spec is write-once and stays untouched.)
(Migration: the canonical workspace entry template is the fused `workspace_V_0-3-0` or later, which MUST NOT be composed via `includes` by any package.)

## MODIFIED Requirements

### Requirement: Retired Templates Move to a Frozen Distribution Partition

`scripts/template-catalog.mjs` MUST define `FROZEN_NAMES = ['cogNNitive']` and MUST emit a top-level `frozen` object in `catalog.json` while dropping that name from `templates`. `manifest/source.yaml` MUST declare a `frozen_templates:` partition holding `cogNNitive` with its file path and `spec_version`, and MUST NOT list `base` anywhere. `scripts/verify.js` MUST parse both `templates:` and `frozen_templates:` blocks when validating the template inventory, so the guard passes with the frozen folder still on disk. Frozen template files MUST remain byte-identical and resolvable for legacy pins. `nn-preflight` upgrade-check SHALL read only `catalog.templates`, so frozen templates get no upgrade notices.
(Previously: `FROZEN_NAMES` and `frozen_templates:` held `cogNNitive` and `base`.)

#### Scenario: Catalog emits a frozen partition
- GIVEN `scripts/template-catalog.mjs` runs with `FROZEN_NAMES` set
- WHEN `catalog.json` is regenerated
- THEN `cogNNitive` appears under a top-level `frozen` object
- AND it is absent from `templates`
- AND `base` appears nowhere in `catalog.json`

#### Scenario: Inventory guard accepts the frozen folder
- GIVEN `iNNfo/specs/bluepriNNts/cogNNitive/` still on disk
- AND `manifest/source.yaml` declares it under `frozen_templates:`
- WHEN `scripts/verify.js` runs the template inventory guard
- THEN the guard passes with no missing-declaration error

#### Scenario: Base folder and entry are gone
- GIVEN the change is applied
- WHEN `iNNfo/specs/bluepriNNts/base/` and `manifest/source.yaml` are inspected
- THEN the folder does not exist and no `base` entry exists in either partition
- AND the template inventory guard passes

#### Scenario: Frozen templates receive no upgrade notice
- GIVEN a workspace pinned to `cogNNitive_V_0-2-0_NN.md`
- WHEN `nn-preflight` upgrade-check runs
- THEN no upgrade notice is emitted for the frozen template
- AND its status is reported as `unlisted`

#### Scenario: Live corpus holds no base reference
- GIVEN live source, tests, fixtures, skills and docs
- WHEN searched for the `base` bluepriNNt (spec path, `*_base_NN.md` entrypoint and manifest entry)
- THEN hits exist only in write-once published files (`iNNfo_V_0-3-0`, `iNNfo_V_0-4-0`, frozen `workspace_V_0-2-0`/`cogNNitive_V_0-2-0` specs) and archived changes
