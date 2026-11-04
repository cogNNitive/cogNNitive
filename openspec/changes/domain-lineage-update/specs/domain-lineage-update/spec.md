# Domain Lineage Update & Blueprint Reconciliation

## Purpose

Provide domaiNN workspaces with an audited, consent-gated, and atomic mechanism to update Level 3 domain data models (`kNNowledge`) when newer canonical Level 2 blueprint schemas (`bluepriNNt`) are published in the catalog. All mutations are performed via formal iNNfo Changesets (`ChangesetDocument`) validated through the core parser and validator, eliminating raw text/regex file patching and enforcing atomic group reconciliation across compact and distributed concepts.

## Requirements

### Requirement: Canonical Lineage Vocabulary & Update Terminology

The workspace management system MUST use canonical iNNfo vocabulary for domain updates:

1. The operation of adopting newer blueprint versions SHALL be named **`update`** (never `upgrade`).
2. The reconciliation of pinned models to newer blueprint schemas SHALL be named **`Blueprint Lineage Reconciliation`** (never `Flow B`).
3. The read-only inspection of model pins against the catalog SHALL be named **`Lineage Audit`** (never `Tier-3 upgrade scan`).
4. Legacy terms (`nn-upgrade`, `Flow B`, `upgrade-available`) MAY exist as deprecated compatibility aliases but MUST NOT be used in primary documentation, console outputs, or new specifications.

#### Scenario: Lineage update terminology in audit report
- GIVEN a domaiNN workspace with models pinned to older blueprints
- WHEN the lineage audit runs
- THEN the report classifies models with `update-available`
- AND describes the next step as `Blueprint Lineage Reconciliation`

---

### Requirement: Lineage Audit & Detection Scan

The lineage audit engine MUST perform a non-mutating scan of the workspace:

1. Discover all Level 3 knowledge models in the workspace (including compact root models and distributed collection models).
2. Extract the pinned blueprint name and version from each model's `parent_spec`.
3. Compare pinned versions against the committed canonical catalog (`iNNfo/specs/bluepriNNts/catalog.json`).
4. Classify each model as:
   - `current` — pinned version matches the catalog's `adopted` version.
   - `update-available` — a newer published version is the `adopted` version, reporting the semver gap (`major`, `minor`, `patch`).
   - `ahead` — pinned to a version newer than catalog adopted.
   - `unlisted` — blueprint not present in canonical catalog (local specialization).
5. Detect and report any pre-existing **Version Skew** where multiple models in the same domain pin different versions of the same blueprint.
6. The audit MUST be strictly read-only and MUST NOT return a blocking exit code when updates are available.

#### Scenario: Model has update available
- GIVEN a workspace model pinned to `coNNtent_V_0-14-1`
- AND the catalog adopted version of `coNNtent` is `V_0-15-0`
- WHEN the lineage audit runs
- THEN the model is classified as `update-available`
- AND the gap is reported as `minor`
- AND the audit exits with status code 0

#### Scenario: Pre-existing blueprint skew detected
- GIVEN a workspace containing two models pinning `coNNtent_V_0-13-6` and `coNNtent_V_0-14-1`
- WHEN the lineage audit runs
- THEN it reports a `BLUEPRINT_VERSION_SKEW` warning
- AND groups both models into a single reconciliation unit targeting `V_0-15-0`

---

### Requirement: Grouped Reconciliation Planning

A Lineage Reconciliation Plan MUST group models by blueprint:

1. **The unit of reconciliation is the Blueprint Group, never an individual model.**
2. Every model in the domain pinning the blueprint MUST be included in the reconciliation unit.
3. The plan MUST compute a deterministic `planHash` across all member paths and current pins.
4. Before any mutation is executed, the runner MUST verify `isPlanFresh(plan, workspaceDir)`. If the hash does not match, the runner MUST abort with `PLAN_STALE` and write nothing.

#### Scenario: Multiple instances reconciled as one unit
- GIVEN a distributed concept with 24 scene models pinning `coNNtent_V_0-14-1`
- WHEN a reconciliation plan is generated
- THEN the plan contains exactly 1 unit containing all 24 member models
- AND the required consent count specifies 24 models

#### Scenario: Plan staleness aborts execution
- GIVEN a generated reconciliation plan with a valid `planHash`
- WHEN a model file is modified or added in the workspace before execution
- AND the reconcile command is invoked
- THEN the run aborts with error code `PLAN_STALE`
- AND no file is written or mutated

---

### Requirement: Changeset-Driven Lineage Mutation

All model mutations during blueprint reconciliation MUST be generated and applied through the formal iNNfo Changeset engine:

1. The reconciliation engine MUST NOT perform raw string regex replacement on document source files.
2. The engine MUST parse each model into an AST using `parseKnowledge()`.
3. The engine MUST compare the pinned schema against the target blueprint schema and generate a typed `ChangesetDocument`:
   - `repin_blueprint` mutation: updates `parent_spec.name`, `parent_spec.url`, and `blueprint_version`.
   - `rename_concept` mutation: updates concept headings and structural references.
   - `rename_field` mutation: updates field identifiers based on agreed schema mapping.
   - `set_field_default` mutation: populates required fields introduced in the newer blueprint with schema-defined defaults.
4. Each generated changeset MUST pass `validateKnowledge()` against the target blueprint schema before application.
5. Mutations MUST be applied via `executeChangesetApply()` to guarantee full syntax validity and provenance tracking.

#### Scenario: Model frontmatter repinned via Changeset
- GIVEN a model document with `parent_spec: { name: coNNtent_V_0-14-1, url: specs/bluepriNNts/coNNtent/spec_NN.md }`
- WHEN the lineage reconciliation applies the update to `V_0-15-0`
- THEN a Changeset with operation `repin_blueprint` is generated
- AND applied through `executeChangesetApply()`
- AND the resulting document carries valid YAML frontmatter pointing to `coNNtent_V_0-15-0`
- AND no unrelated byte or comment is corrupted

---

### Requirement: Distributed Storage Concept Reconciliation

In distributed storage models where concept instances reside across separate documents in a collection directory:

1. Mapping questions for removed, renamed, or re-typed definitions MUST be asked **once per concept**, never per instance document.
2. The resolved mapping decisions MUST be applied uniformly across all instance models of that concept.
3. Collection directory placement rules and instance model naming conventions MUST be preserved.

#### Scenario: Field rename asked once for 20 distributed instances
- GIVEN a concept with 20 separate instance models in `episodes/`
- AND the target blueprint renames field `synopsis` to `overview`
- WHEN the impact analysis runs
- THEN exactly one mapping prompt is presented for the concept
- AND the resulting mapping is applied across all 20 instance models via their respective changesets

---

### Requirement: Atomic All-or-None Safety Gate & Backup

Lineage updates MUST be atomic and protected by consent and backup gates:

1. **Consent Gate**: No mutation MAY occur without explicit consent naming the exact model count and target blueprint version.
2. **Pre-write Backup**: A timestamped workspace backup outside the workspace root with SHA-256 verification manifest MUST be created before any write.
3. **All-or-None Rollback**: If post-mutation validation (`validateKnowledge`) fails for any single model in the unit, EVERY modified file in the workspace MUST be restored to its pre-run state. The workspace MUST NEVER be left in a partially updated or skewed state.

#### Scenario: Validation failure restores pre-update state
- GIVEN a unit of 10 models undergoing blueprint update
- WHEN 9 models validate successfully but the 10th fails post-mutation schema validation
- THEN the reconciliation aborts with `UNIT_REVALIDATION_FAILED`
- AND all 10 models are restored to their exact pre-update state from backup
- AND the failed model path and diagnostic are reported to the user
