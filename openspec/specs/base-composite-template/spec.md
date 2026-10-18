# Base Composite Template

## Purpose

Define a new Level-2 composite template package `base_V_0-1-0` that composes `workspace_V_0-2-0` and `cogNNitive_V_0-2-0` via `includes`, providing an opt-in overview-root document pattern that makes the inventory manifest and the provenance model siblings under one parsed parent, without altering either published template.
## Requirements
### Requirement: Retired Templates Move to a Frozen Distribution Partition

`scripts/blueprint-catalog.mjs` MUST define `FROZEN_NAMES = ['cogNNitive', 'workspace']` and MUST emit a top-level `frozen` object in `catalog.json` while dropping those names from `blueprints`. `manifest/source.yaml` MUST declare a `frozen_blueprints:` partition holding `cogNNitive` and `workspace` with their file paths, and MUST NOT list `base` anywhere. `scripts/verify.js` MUST parse both `blueprints:` and `frozen_blueprints:` blocks when validating the blueprint inventory, so the guard passes with the frozen folders still on disk. Frozen means "no upgrade notices", not "never edited": the live `spec_NN.md` of a frozen bluepriNNt MAY be edited with a `template_version` bump (this change converts `cogNNitive` and `workspace` in place), while its published `_V_x-y-z_` files (`cogNNitive_V_0-2-1_NN.md`, `workspace_V_0-2-2_NN.md`) MUST remain byte-identical and resolvable for legacy pins. `nn-preflight` upgrade-check SHALL read only `catalog.blueprints`, so frozen bluepriNNts get no upgrade notices.
(Previously: the living text named `scripts/template-catalog.mjs`, `frozen_templates:` and `catalog.templates`, which the code had already renamed to `scripts/blueprint-catalog.mjs`, `frozen_blueprints:` and `catalog.blueprints`; `FROZEN_NAMES` held `cogNNitive`, `base` and `workspace`.)

#### Scenario: Catalog emits a frozen partition
- GIVEN `scripts/blueprint-catalog.mjs` runs with `FROZEN_NAMES` set
- WHEN `catalog.json` is regenerated
- THEN `cogNNitive` and `workspace` appear under a top-level `frozen` object
- AND they are absent from `blueprints`
- AND `base` appears nowhere in `catalog.json`

#### Scenario: A frozen bluepriNNt is converted in place
- GIVEN the frozen `cogNNitive` bluepriNNt
- WHEN its live `spec_NN.md` drops its Marker Definition and bumps `template_version`
- THEN it stays under `frozen_blueprints` and `catalog.frozen`
- AND `cogNNitive_V_0-2-1_NN.md` is byte-identical to before

#### Scenario: Inventory guard accepts the frozen folder
- GIVEN `iNNfo/specs/bluepriNNts/cogNNitive/` still on disk
- AND `manifest/source.yaml` declares it under `frozen_blueprints:`
- WHEN `scripts/verify.js` runs the template inventory guard
- THEN the guard passes with no missing-declaration error

#### Scenario: Base folder and entry are gone
- GIVEN the change is applied
- WHEN `iNNfo/specs/bluepriNNts/base/` and `manifest/source.yaml` are inspected
- THEN the folder does not exist and no `base` entry exists in either partition
- AND the template inventory guard passes

#### Scenario: Frozen templates receive no upgrade notice
- GIVEN a workspace pinned to `cogNNitive_V_0-2-1_NN.md`
- WHEN `nn-preflight` upgrade-check runs
- THEN no upgrade notice is emitted for the frozen template
- AND its status is reported as `unlisted`

#### Scenario: Live corpus holds no base reference
- GIVEN live source, tests, fixtures, skills and docs
- WHEN searched for the `base` bluepriNNt (spec path, `*_base_NN.md` entrypoint and manifest entry)
- THEN hits exist only in write-once published files (`iNNfo_V_0-3-0`, `iNNfo_V_0-4-0`, and the frozen `_V_x-y-z_` files of `workspace` and `cogNNitive`) and archived changes

