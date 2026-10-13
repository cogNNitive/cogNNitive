# Delta for changeset-apply-engine

## MODIFIED Requirements

### Requirement: Two-Phase Apply Transaction

The apply engine MUST execute mutations using a strict two-phase transactional lifecycle:

1. **Phase 1: In-Memory Compute and Validate**:
   - The engine MUST seal a changeset whose frontmatter omits `proposal_sha` at intake (compute `computeProposalSha` over the parsed changes and write it back) before verification; a `proposal_sha` that is present but does not match MUST be rejected with `PROPOSAL_TAMPERED`.
   - The engine MUST check preconditions (`from` values). If a target field's current value does not match `from`, the engine MUST reject the change with a `PRECONDITION_FAILED` or `CONFLICT` error.
   - Mutations MUST be applied to in-memory ASTs of target models.
   - For every touched field, the engine MUST rewrite citations to cite the applied change (per `field-citation-provenance` / D20) and record a replaced citation in the change's `replaced_sources::` annotation.
   - The engine MUST bump `knowledge_version` in the frontmatter of each affected model (per `knowledge-version-and-snapshot`).
   - The engine MUST run full schema validation (`validateKnowledge`) on all touched models against their blueprints. If any validation error occurs, the entire transaction MUST abort immediately: the lock MUST be released, zero files MUST be written or renamed on disk, and the engine MUST throw `VALIDATION_FAILED` with diagnostic details.
   - The engine MUST compute the changeset write-back bytes and pass the proposal immutability assertion before Phase 2 starts.

2. **Phase 2: Atomic Persistence**:
   - For each touched model, the mutated content MUST be written to `<rootDir>/kNNowledge/<model_stem>.tmp` and then renamed over `<rootDir>/kNNowledge/<model_stem>_NN.md` (see "Crash-safe persist"). No copy of the previous model is written anywhere.
   - The changeset document on disk MUST be updated through the raw-text-preserving serializer with:
     - Frontmatter `status: applied` (or `partially_applied`), `applied_at: <ISO-timestamp>`, and `models: { [slug]: { base_version, result_version } }`.
     - Each change element annotated with `status::`, `resolution::`, `resolved_slug::` where a slug was assigned, and `replaced_sources::` where a citation was replaced.
   - The lock `changes/.lock` MUST be released.
(Previously: Phase 2 copied the previous model into `kNNowledge/archive/` before the rename, and the changeset was re-rendered from the parsed object.)

#### Scenario: Transaction aborts on validation failure with zero disk changes
- GIVEN a changeset that would produce an invalid model state (e.g., missing required field or schema violation)
- WHEN Phase 1 validation executes
- THEN schema validation fails with error diagnostics
- AND the transaction aborts with `VALIDATION_FAILED`
- AND no `.tmp` files or modified active model files exist on disk
- AND the lock is cleanly released

#### Scenario: Successful two-phase apply completes atomically
- GIVEN a valid changeset modifying `strategy` model
- WHEN `apply_change` executes
- THEN Phase 1 validates cleanly
- AND Phase 2 writes `strategy.tmp` and renames it to `kNNowledge/strategy_NN.md`
- AND no `kNNowledge/archive/` directory exists
- AND the changeset file is updated with `status: applied` and per-change `status:: applied` annotations
- AND lock is released

#### Scenario: Precondition mismatch triggers conflict
- GIVEN an `update_field` change expecting `from:: Draft`
- AND the target model currently has value `Published`
- WHEN `apply_change` evaluates preconditions in Phase 1
- THEN the transaction aborts with precondition conflict
- AND no changes are written to disk

#### Scenario: An unsealed proposal is sealed at intake instead of rejected
- GIVEN a changeset produced by the console review export whose frontmatter has no `proposal_sha`
- WHEN `apply_change` executes
- THEN the engine stamps `proposal_sha` with `computeProposalSha` over the parsed changes
- AND the changeset applies (or fails on its own merits), never with `PROPOSAL_TAMPERED`
- AND the written-back changeset carries a seal that `verifyProposalSha` accepts

### Requirement: Crash-safe persist

Persisting a model MUST never leave the live file absent or partially written: the new content MUST be staged in `<model_stem>.tmp` and renamed over the live path, and the live file MUST NOT be removed, moved or copied first. If the rename fails, the engine MUST remove the `.tmp` file and the live file MUST remain byte-identical. (Previously: the live file was copied to `kNNowledge/archive/` before the rename.)

#### Scenario: Failure during the rename
- GIVEN a staged `strategy.tmp`
- WHEN the final rename fails
- THEN `kNNowledge/strategy_NN.md` still exists, byte-identical to before
- AND no `strategy.tmp` and no `kNNowledge/archive/` remain

### Requirement: Idempotent Replay

Applying an already applied changeset MUST be an idempotent no-op:
- When `apply_change` is invoked on a changeset with frontmatter `status: "applied"`, the engine MUST check the current `knowledge_version` of each model listed in the changeset's `models` map against the recorded `result_version`.
- If all target models already match their recorded `result_version`, the engine MUST return a successful execution report without executing mutations, without bumping versions again, and without writing any file.
- If target model versions have advanced beyond `result_version` or diverge, the engine MUST return a status indicating the changeset is already applied and no mutation was performed.
(Previously: the no-op was defined as not creating duplicate archive snapshots.)

#### Scenario: Re-applying an applied changeset is a safe no-op
- GIVEN a changeset with `status: applied` and recorded `result_version: "V_0-1-1"` for `strategy`
- AND `kNNowledge/strategy_NN.md` currently has `knowledge_version: "V_0-1-1"`
- WHEN `apply_change` is invoked on that changeset
- THEN the engine recognizes the applied state
- AND returns success without writing any model or changeset file

## ADDED Requirements

### Requirement: Proposal immutability on apply

Applying a changeset MUST NOT alter any normative line of the proposal. Before Phase 2 (and before the write-back on the conflict path), the engine MUST compare, for every change block, the normative lines of the bytes it is about to write — every line except the execution annotations `status::`, `resolution::`, `resolved_slug::` and `replaced_sources::` — with the input; any difference MUST abort with `PROPOSAL_IMMUTABILITY_VIOLATION`, writing nothing and releasing the lock. Execution facts MUST be recorded only in the frontmatter execution keys and the per-change annotations; no outcome section MAY be appended to the document.

#### Scenario: Proposed blocks are preserved
- GIVEN a sealed changeset with changes `c-01` and `c-02`, CRLF line endings and a quoted `to::` value
- WHEN it is applied
- THEN every normative line of `c-01` and `c-02` is byte-identical to the input
- AND `verifyProposalSha` returns `true`

#### Scenario: A mutating write-back is refused
- GIVEN a write-back that would change the `to::` line of `c-01`
- WHEN apply reaches the immutability assertion
- THEN it fails with `PROPOSAL_IMMUTABILITY_VIOLATION`
- AND no model, changeset or `.tmp` file is written
