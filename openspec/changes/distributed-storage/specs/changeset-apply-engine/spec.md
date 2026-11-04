# Delta for changeset-apply-engine

Living spec read: `openspec/specs/changeset-apply-engine/spec.md`. Three requirements are replaced because they hard-code `kNNowledge/<stem>_NN.md` as the only model location: Two-Phase Apply Transaction (Phase 2 path), Crash-safe persist, and Model creation via `add_model`. Everything else is unchanged: the single-writer lock, `base_hash`, idempotent replay, retirement of the Agent Modification block, proposal-time evidence citation, proposal immutability, concept conformance at `add_element`, `init_knowledge` as an `add_model` wrapper (it creates compact models in `kNNowledge/` as before), persisted rejections, error codes (extended by design with codes for container-missing and placement), classified direct operations, type-preserving field updates, concept-level field and matrix operations, multi-valued updates, and empty `to`. Overlap: `lineage-as-changes` also edits this living spec; rebase this delta onto its merged text before archive.

## MODIFIED Requirements

### Requirement: Two-Phase Apply Transaction

The apply engine MUST execute mutations using a strict two-phase transactional lifecycle:

1. **Phase 1: In-Memory Compute and Validate**:
   - The engine MUST seal a changeset whose frontmatter omits `proposal_sha` at intake (compute `computeProposalSha` over the parsed changes and write it back) before verification; a `proposal_sha` that is present but does not match MUST be rejected with `PROPOSAL_TAMPERED`.
   - The engine MUST partition the changes per change (see `changeset-conflicts`): a change whose precondition fails (`from` mismatch, missing target, stale `base_hash`, reference conflict) is annotated `status:: conflict` and skipped; it does not abort the clean changes.
   - Mutations MUST be applied to in-memory ASTs of target models.
   - Only `update_field` and `add_element` rewrite citations: they cite the applied change (per `field-citation-provenance` / D20), and `update_field` records the replaced citation in the change's `replaced_sources::` annotation.
   - The engine MUST bump `knowledge_version` in the frontmatter of each affected model exactly once (per `knowledge-version-and-snapshot`): patch by default, or the level requested by a `bump_version` change.
   - The engine MUST run full schema validation (`validateKnowledge`) on all touched models against their blueprints, together with placement, naming and identity validation (`placement-validation`) for every touched instance model. If any validation error occurs, the transaction MUST abort before Phase 2: the lock MUST be released, zero model files MUST be written or renamed, and the result MUST carry `status: rejected` with errors coded `VALIDATION_FAILED`. The rejection is persisted in the changeset (see "Rejected changesets are persisted"); the engine does not throw.
   - The engine MUST compute the changeset write-back bytes and pass the proposal immutability assertion before Phase 2 starts.

2. **Phase 2: Atomic Persistence**:
   - For each touched model, the mutated content MUST be written to a temporary file next to the model's own file path and then renamed over that path (see "Crash-safe persist"). The model's file path is `<rootDir>/kNNowledge/<model_stem>_NN.md` for a compact model created by this engine, and the placement path for an instance model. No copy of the previous model is written anywhere.
   - The changeset document on disk MUST be updated through the raw-text-preserving serializer with:
     - Frontmatter `status: applied` (or `partially_applied`), `applied_at: <ISO-timestamp>`, and `models: { [model_id]: { base_version, result_version } }`.
     - Each change element annotated with `status::`, `resolution::`, `resolved_slug::` where a slug was assigned, and `replaced_sources::` where a citation was replaced.
   - The lock `changes/.lock` MUST be released.
(Previously: Phase 2 wrote `<rootDir>/kNNowledge/<model_stem>.tmp` and renamed it over `kNNowledge/<model_stem>_NN.md` for every model; validation had no placement step; `models` was keyed by slug.)

#### Scenario: Transaction aborts on validation failure with zero model changes
- GIVEN a changeset that would produce an invalid model state (e.g., missing required field or schema violation)
- WHEN Phase 1 validation executes
- THEN schema validation fails with error diagnostics coded `VALIDATION_FAILED`
- AND the result has `status: rejected`
- AND no `.tmp` files or modified active model files exist on disk
- AND the changeset on disk records `status: rejected` with a `resolution`
- AND the lock is cleanly released

#### Scenario: Successful two-phase apply completes atomically
- GIVEN a valid changeset modifying `strategy` model
- WHEN `apply_change` executes
- THEN Phase 1 validates cleanly
- AND Phase 2 writes a temporary file and renames it to `kNNowledge/strategy_NN.md`
- AND no `kNNowledge/archive/` directory exists
- AND the changeset file is updated with `status: applied` and per-change `status:: applied` annotations
- AND lock is released

#### Scenario: Instance model is persisted at its own path
- GIVEN a valid changeset updating Scene `00-gancho` of `villabotijos-today/pepper-mapache`
- WHEN `apply_change` executes
- THEN Phase 2 renames the temporary file over the instance model's file under `series/villabotijos-today/assets/pepper-mapache/`
- AND no file is written under `kNNowledge/`

#### Scenario: Placement violation aborts before Phase 2
- GIVEN a changeset whose result would leave an instance model outside its placement path
- WHEN Phase 1 validation executes
- THEN the result is `rejected` with `VALIDATION_FAILED` naming the placement finding
- AND zero model files are written

#### Scenario: Precondition mismatch triggers conflict
- GIVEN an `update_field` change expecting `from:: Draft`
- AND the target model currently has value `Published`
- WHEN `apply_change` evaluates preconditions in Phase 1
- THEN that change is annotated `status:: conflict` with a `PRECONDITION_FAILED` resolution
- AND, when it is the only actionable change, the changeset ends with status `conflict` and no model is written
- AND, when other changes are clean, they apply and the changeset ends `partially_applied`

#### Scenario: An unsealed proposal is sealed at intake instead of rejected
- GIVEN a changeset produced by the console review export whose frontmatter has no `proposal_sha`
- WHEN `apply_change` executes
- THEN the engine stamps `proposal_sha` with `computeProposalSha` over the parsed changes
- AND the changeset applies (or fails on its own merits), never with `PROPOSAL_TAMPERED`
- AND the written-back changeset carries a seal that `verifyProposalSha` accepts

### Requirement: Crash-safe persist

Persisting a model MUST never leave the live file absent or partially written: the new content MUST be staged in a temporary file in the same directory as the model's file and renamed over the live path, and the live file MUST NOT be removed, moved or copied first. If the rename fails, the engine MUST remove the temporary file and the live file MUST remain byte-identical. When persisting creates new folders for an instance model, a failure MUST remove the folders it created. (Previously: the staging file was `<model_stem>.tmp` under `kNNowledge/`; no folder creation was considered.)

#### Scenario: Failure during the rename
- GIVEN a staged temporary file for `strategy`
- WHEN the final rename fails
- THEN `kNNowledge/strategy_NN.md` still exists, byte-identical to before
- AND no temporary file and no `kNNowledge/archive/` remain

#### Scenario: Failure while creating an instance model
- GIVEN an `add_model` for `villabotijos-today/new-episode` whose final rename fails
- WHEN the engine cleans up
- THEN no temporary file remains
- AND `series/villabotijos-today/assets/new-episode/` does not exist

### Requirement: Model creation via `add_model`

The apply engine MUST create a new Level-3 document for each clean `add_model` change.
In Phase 1 it MUST resolve the bluepriNNt from `blueprint_url`/`blueprint_name` (an
unresolvable bluepriNNt rejects the change with `BLUEPRINT_UNRESOLVED`; no
frontmatter-only document is ever written), scaffold the document with the shared
`scaffoldKnowledgeDocument` (the same frontmatter and starter body `init_knowledge`
produced before this change: index block, one section per Concept, matrices, markers),
and register it in memory so later changes in the same changeset that target the new id
load it instead of failing with `Model not found`. `knowledge_version` MUST be the
explicit value when given, else the resolved bluepriNNt `blueprint_version` or
`spec_version`, else `V_0-1-0`, with no `VERSION_MISMATCH` refusal.

Where the model is written depends on the storage of the instantiated concept. A compact model (no distributed concept) MUST be written to `kNNowledge/<id>_NN.md`. An instance model of a distributed concept MUST be written to the placement path of that concept, with the target a hierarchical id; the container MUST exist as an instance (or the domaiNN root) or be created by an earlier `add_model` in the same changeset, otherwise the change MUST be rejected and nothing written.

Conflict semantics: an `add_model` change has no `base_hash` and no `from`. When a model
with the target id already exists, or the placement path is already occupied, the change MUST be partitioned as a conflict with code
`MODEL_EXISTS`, and every other change in the changeset targeting that id MUST be
conflicted with `DEPENDS_ON_CONFLICTED_CHANGE`. A change targeting a model created by a
later `add_model` MUST be rejected (`ADD_MODEL_ORDER`), as MUST two `add_model` changes
with the same target.

The created model MUST NOT be version-bumped in the same apply; its `models` entry MUST
carry only `result_version` (no `base_version`). It MUST pass the same schema validation
pass as every touched model, plus placement, naming and identity validation for an instance model. Persistence MUST write the model's file through a
temporary file renamed into place after re-checking, inside the lock, that the target is
still absent, with no archive copy; a domain without `kNNowledge/` MUST be rejected with
`DOMAIN_LAYOUT_INVALID` only when a compact model is being created. After the commit, outside the lock, the `apply_change` handler
MUST reconcile the domain manifest (`sync_domain_manifest`, non-dry) and report it as
`manifest`; a reconciliation failure MUST NOT alter the apply outcome.
(Previously: every created model was written to `kNNowledge/<id>_NN.md`, the target could not contain `/`, and a domain without `kNNowledge/` was always rejected.)

#### Scenario: Creates a valid Level-3 document
- GIVEN a domain created by `init_domain` and a sealed changeset with one `add_model` for `acme` on the `business` bluepriNNt
- WHEN `apply_change` runs
- THEN `kNNowledge/acme_NN.md` exists
- AND `validate_knowledge` on it returns `valid: true`
- AND the changeset `models.acme` has a `result_version` and no `base_version`

#### Scenario: Creates an instance model at its placement path
- GIVEN series `innteresante` and a sealed `add_model` targeting `innteresante/intro` for concept `Video`
- WHEN `apply_change` runs
- THEN the model exists at the Video placement path under `series/innteresante/assets/intro/`
- AND `validate_knowledge` on it returns `valid: true`
- AND `models` holds `innteresante/intro` with `result_version` only

#### Scenario: Instance creation needs no `kNNowledge/`
- GIVEN a domaiNN without a `kNNowledge/` folder and the same `add_model`
- WHEN `apply_change` runs
- THEN the model is created and `DOMAIN_LAYOUT_INVALID` is not returned

#### Scenario: Fails on an existing model
- GIVEN model `strategy` exists
- WHEN a changeset with `add_model` targeting `strategy` and an `add_element` targeting `strategy` is applied
- THEN both changes are conflicted (`MODEL_EXISTS`, `DEPENDS_ON_CONFLICTED_CHANGE`)
- AND `strategy_NN.md` is byte-identical to before

#### Scenario: Fails on an existing instance
- GIVEN `innteresante/intro` exists
- WHEN `add_model` targets `innteresante/intro`
- THEN the change is conflicted with `MODEL_EXISTS` and the file is byte-identical

#### Scenario: Initial elements in the same changeset
- GIVEN `add_model` for `acme` followed by `add_element` targeting `acme`
- WHEN the changeset is applied
- THEN `acme_NN.md` contains the scaffold plus the added element
- AND `acme` is not version-bumped beyond its initial version

#### Scenario: Unresolvable bluepriNNt writes nothing
- GIVEN an `add_model` whose `blueprint_url` cannot be resolved
- WHEN the changeset is applied
- THEN it is rejected with `BLUEPRINT_UNRESOLVED`
- AND no file is created under `kNNowledge/`

## ADDED Requirements

### Requirement: Instance operations are applied through the same transaction

Rename and move of an instance model and the compact-to-distributed migration MUST be applied through the two-phase transaction above: one in-memory pass, whole-file validation including placement, atomic persistence, lock, rollback, and an entry in `models` for every touched file. A rename or move MUST NOT leave an intermediate state with the folder renamed and the file or id unchanged.

#### Scenario: Rename is atomic
- GIVEN a rename of `innteresante/intro` to `welcome` whose persistence fails after the folder is renamed
- WHEN the engine rolls back
- THEN the folder, the file and the id are as before the apply
- AND the lock is released

#### Scenario: A rename touching a second file is validated as a whole
- GIVEN a move that also rewrites a reference in another model
- WHEN the changeset is applied and the second model would be invalid
- THEN the result is `rejected` and neither model nor folder changed
