# Knowledge Version and Snapshot Specification

## Purpose

Establish model versioning and snapshot archival for live knowledge models in cogNNitive. Live model filenames remain invariant (`kNNowledge/<model_stem>_NN.md`), tracking semantic versions in frontmatter (`knowledge_version`). Applying a changeset bumps the version (patch default) and archives the prior snapshot to `kNNowledge/archive/`. Deep archive exclusion guarantees snapshots are invisible to discovery and validators, while decoupling `knowledge_version` from blueprint `spec_version`.

## Requirements

### Requirement: Invariant Live Model Naming with Frontmatter Versioning

Live knowledge model files under `kNNowledge/` MUST maintain invariant filenames matching `NN_NAME_INVARIANT` (`<model_stem>_NN.md`). Live filenames MUST NOT embed version tags (such as `_V_0-1-0_`). Model semantic versions MUST be stored in the document frontmatter as `knowledge_version` (formatted as `"V_MAJOR-MINOR-PATCH"` or standard semver string e.g., `"V_0-1-0"`).

#### Scenario: Live model filename remains invariant across mutations
- GIVEN a model file `kNNowledge/pricing_NN.md` with `knowledge_version: "V_0-1-0"`
- WHEN a changeset is applied that bumps the model version
- THEN the updated active model file is saved as `kNNowledge/pricing_NN.md`
- AND its frontmatter `knowledge_version` is updated to `"V_0-1-1"`
- AND no new versioned file is created in the live `kNNowledge/` directory

---

### Requirement: Model Version Bumping on Changeset Apply

Applying a changeset MUST increment the `knowledge_version` of every touched model exactly once per changeset transaction.
- The default bump increment MUST be `patch` (e.g. `V_0-1-0` $\to$ `V_0-1-1`).
- The changeset or apply options MAY request a `minor` (e.g. `V_0-1-0` $\to$ `V_0-2-0`) or `major` bump.
- Models unaffected by the changeset MUST NOT have their version bumped.
- Both the `base_version` (version before mutation) and `result_version` (version after mutation) MUST be recorded in the changeset frontmatter `models` map.

#### Scenario: Changeset increments patch version once for affected models
- GIVEN `kNNowledge/catalog_NN.md` at `knowledge_version: "V_1-0-2"`
- AND `kNNowledge/customers_NN.md` at `knowledge_version: "V_0-4-0"`
- WHEN a changeset touching only `catalog` is applied
- THEN `catalog_NN.md` has `knowledge_version: "V_1-0-3"`
- AND `customers_NN.md` retains `knowledge_version: "V_0-4-0"`
- AND the changeset records `catalog: { base_version: "V_1-0-2", result_version: "V_1-0-3" }`

---

### Requirement: Snapshot Archival to `kNNowledge/archive/`

During Phase 2 of a changeset application, the active model file prior to mutation MUST be moved into `<rootDir>/kNNowledge/archive/`.
- The archived snapshot file MUST be named according to the contract:
  `<model_stem>_<base_version>_<stamp>_<changeset_stem>_NN.md`
  where:
  - `<model_stem>` is the model name without `_NN.md`
  - `<base_version>` is the `knowledge_version` before the bump
  - `<stamp>` is the UTC timestamp (`YYYYMMDDTHHMMSSZ`) of application
  - `<changeset_stem>` is the changeset identifier or filename stem
- The snapshot file MUST preserve the complete unmodified content of the model prior to applying the changeset.
- The directory `<rootDir>/kNNowledge/archive/` MUST be created automatically if it does not exist.

#### Scenario: Snapshot archived on apply
- GIVEN an active model `kNNowledge/sales_NN.md` at version `V_0-1-0`
- WHEN changeset `ws_agent_20261007T120000Z_changes_NN.md` is applied at stamp `20261007T120005Z`
- THEN the previous file content is moved to:
  `kNNowledge/archive/sales_V_0-1-0_20261007T120005Z_ws_agent_20261007T120000Z_changes_NN.md`
- AND the new mutated model content is placed at `kNNowledge/sales_NN.md`

---

### Requirement: Deep `archive` Directory Exclusion

The path exclusion checker `isExcludedPath` in `innfo-core/src/naming/contract.ts` MUST inspect all path segments and return `true` if any segment equals `'archive'` or `'staging'`. Any directory named `archive` at any nesting depth (e.g. `kNNowledge/archive/`, `sources/archive/`, `deeply/nested/archive/`) MUST be completely excluded from:
- Semantic model discovery (`findKnowledgeFiles`)
- Workspace graph indexing
- Active knowledge validation
- Document catalogs

#### Scenario: Deep archive paths excluded at any depth
- GIVEN paths:
  - `kNNowledge/archive/sales_V_0-1-0_20261007T120005Z_changes_NN.md`
  - `sources/archive/legacy_data.csv`
  - `workspace/subfolder/archive/notes_NN.md`
- WHEN `isExcludedPath` evaluates each path
- THEN it returns `true` for all of them

#### Scenario: Archived model not discovered as live knowledge
- GIVEN a snapshot file in `kNNowledge/archive/`
- WHEN workspace knowledge discovery runs
- THEN the snapshot file is ignored and omitted from candidate models

---

### Requirement: Decoupling Model Version from Blueprint Spec Version

The model creation tool (`init_knowledge`) and model validators MUST decouple the model's `knowledge_version` from its parent blueprint's `spec_version`.
- `init_knowledge` MUST initialize new models with `knowledge_version: "V_0-1-0"` (or template default) independently of whether the parent blueprint has `spec_version: "V_0-4-0"`.
- Knowledge validation MUST NOT fail or emit a `VERSION_MISMATCH` diagnostic when `knowledge_version` diverges from `parent_spec` version.

#### Scenario: Initializing model with decoupled knowledge_version
- GIVEN blueprint `strategy` with `spec_version: "V_0-4-0"`
- WHEN `init_knowledge` creates a new model instance
- THEN the model frontmatter contains `parent_spec: "strategy"`, `blueprint_version: "0.4.0"`, and `knowledge_version: "V_0-1-0"`

#### Scenario: Model version increments freely without blueprint mismatch
- GIVEN a model whose `knowledge_version` has bumped to `V_0-3-5`
- AND whose `parent_spec` is `strategy` with blueprint version `0.4.0`
- WHEN knowledge validation is executed
- THEN no `VERSION_MISMATCH` diagnostic is emitted
