# Knowledge Version Specification

## Purpose

Establish model versioning for live knowledge models in cogNNitive. Live model filenames remain invariant (`kNNowledge/<model_stem>_NN.md`), tracking semantic versions in frontmatter (`knowledge_version`). Applying a changeset bumps the version (patch default; minor or major only through a `bump_version` change). No snapshot of a prior model is archived: the history of a model is the chain of changesets that touched it, each recording its `base_version` and `result_version`, and every replaced citation (`replaced_sources`). Deep `archive` exclusion keeps hand-kept historical folders invisible to discovery and validators, and `knowledge_version` is decoupled from blueprint `spec_version`.
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
- The default bump increment MUST be `patch` (e.g. `V_0-1-0` to `V_0-1-1`).
- A `minor` (e.g. `V_0-1-0` to `V_0-2-0`) or `major` bump MUST be requested only by a `bump_version` change in the changeset (`to:: minor` or `to:: major`). A `bump_version` change replaces the default patch bump of its model; the model is never bumped twice by one changeset. A higher level resets the lower ones.
- The unversioned lineage record cannot be bumped.
- Models unaffected by the changeset (or whose changes all conflicted) MUST NOT have their version bumped.
- Both the `base_version` (version before mutation) and `result_version` (version after mutation) MUST be recorded in the changeset frontmatter `models` map.

#### Scenario: Changeset increments patch version once for affected models
- GIVEN `kNNowledge/catalog_NN.md` at `knowledge_version: "V_1-0-2"`
- AND `kNNowledge/customers_NN.md` at `knowledge_version: "V_0-4-0"`
- WHEN a changeset touching only `catalog` is applied
- THEN `catalog_NN.md` has `knowledge_version: "V_1-0-3"`
- AND `customers_NN.md` retains `knowledge_version: "V_0-4-0"`
- AND the changeset records `catalog: { base_version: "V_1-0-2", result_version: "V_1-0-3" }`

---

### Requirement: Deep `archive` Directory Exclusion

The path exclusion checker `isExcludedPath` in `innfo-core/src/naming/contract.ts` MUST inspect all path segments and return `true` if any segment equals `'archive'` or `'staging'`. Any directory named `archive` at any nesting depth (e.g. `sources/archive/`, `deeply/nested/archive/`) MUST be completely excluded from:
- Semantic model discovery (`findKnowledgeFiles`)
- Workspace graph indexing
- Active knowledge validation
- Document catalogs

No tool writes into an `archive` directory; the exclusion keeps hand-kept or historical folders such as `sources/archive/` invisible.

#### Scenario: Deep archive paths excluded at any depth
- GIVEN paths:
  - `kNNowledge/archive/sales_NN.md`
  - `sources/archive/legacy_data.csv`
  - `workspace/subfolder/archive/notes_NN.md`
- WHEN `isExcludedPath` evaluates each path
- THEN it returns `true` for all of them

#### Scenario: Hand-kept archive is not discovered as live knowledge
- GIVEN a model file under `sources/archive/`
- WHEN workspace knowledge discovery runs
- THEN the file is ignored and omitted from candidate models

### Requirement: Decoupling Model Version from Blueprint Spec Version

The model creation tool (`init_knowledge`) and model validators MUST decouple the model's `knowledge_version` from its parent blueprint's `spec_version`.
- `init_knowledge` (an `add_model` wrapper) MUST initialize a new model's `knowledge_version` from the explicit value when given, else from the parent bluepriNNt's `blueprint_version` (then its `spec_version`), else `V_0-1-0`. The scaffold writes `knowledge_version` and no `blueprint_version` key.
- Knowledge validation MUST NOT fail or emit a `VERSION_MISMATCH` diagnostic when `knowledge_version` diverges from `parent_spec` version.

#### Scenario: Initializing model takes the blueprint version
- GIVEN blueprint `strategy` with `blueprint_version: "V_0-2-0"`
- WHEN `init_knowledge` creates a new model instance without an explicit version
- THEN the model frontmatter contains `parent_spec` naming `strategy` and `knowledge_version: "V_0-2-0"`
- AND the model frontmatter contains no `blueprint_version` key

#### Scenario: Explicit version wins, V_0-1-0 is the last resort
- GIVEN `init_knowledge` is called with `knowledge_version: "V_0-5-0"`
- THEN the new model has `knowledge_version: "V_0-5-0"`
- AND, for a blueprint that declares neither `blueprint_version` nor `spec_version`, the new model has `V_0-1-0`

#### Scenario: Model version increments freely without blueprint mismatch
- GIVEN a model whose `knowledge_version` has bumped to `V_0-3-5`
- AND whose `parent_spec` is `strategy` with blueprint version `V_0-4-0`
- WHEN knowledge validation is executed
- THEN no `VERSION_MISMATCH` diagnostic is emitted

