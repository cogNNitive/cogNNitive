# Changeset Apply Engine Specification

## Purpose

Specify the transactional mutation engine (`apply_change`) that applies changesets to live domain models. The engine enforces single-writer mutual exclusion via `changes/.lock`, executes an atomic two-phase transaction (validate in-memory $\to$ stage `.tmp` $\to$ archive and rename), ensures replay idempotency, annotates changeset resolution, and retires legacy modification blocks.
## Requirements
### Requirement: Single-Writer Lock (`changes/.lock`)

All apply operations MUST acquire a single-writer filesystem lock at `<rootDir>/changes/.lock` before reading target models or executing mutations.
- The lock MUST be acquired via an exclusive file creation flag (`wx`).
- The lock payload MUST contain a JSON object: `{ "pid": number, "timestamp": number, "changeset": string }`.
- If `changes/.lock` exists, the engine MUST inspect its timestamp. If the lock age exceeds 60,000 milliseconds (60s), the lock MUST be considered stale, broken with a warning, and re-acquired.
- If the lock is currently held and not stale, the engine MUST fail fast with error `CONCURRENT_APPLY_ACTIVE`.
- The lock MUST be released deterministically in a `finally` block across all success and error execution paths.

#### Scenario: Successful lock acquisition and release
- GIVEN an idle workspace with no `changes/.lock`
- WHEN `apply_change` begins execution
- THEN `changes/.lock` is created containing the process pid, timestamp, and changeset identifier
- AND when execution finishes, `changes/.lock` is unlinked

#### Scenario: Concurrent apply attempt fails fast
- GIVEN an active apply transaction holding `changes/.lock` with timestamp < 60s ago
- WHEN another process or call attempts `apply_change`
- THEN the second call fails immediately with `CONCURRENT_APPLY_ACTIVE`
- AND the existing lock file remains intact

#### Scenario: Stale lock recovery
- GIVEN a dead lock file `changes/.lock` older than 60 seconds
- WHEN `apply_change` attempts lock acquisition
- THEN the stale lock is logged as broken and removed
- AND the new transaction successfully acquires the lock

---

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

### Requirement: base_hash precondition

A change MAY carry `base_hash`; when present and it differs from the current hash of the target element, `apply_change` MUST reject that change as a precondition failure using
the existing partial-apply path, leaving the model untouched for that change. When
absent, behavior is unchanged.

#### Scenario: Stale base_hash

- GIVEN an `update_field` change with `base_hash:: H1` and the element's current hash is H2
- WHEN the changeset is applied
- THEN that change is reported as a precondition failure and the field is not written

#### Scenario: Matching base_hash

- GIVEN `base_hash` equals the element's current hash
- WHEN the changeset is applied
- THEN the change applies normally

---

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

### Requirement: Retirement of Agent Modification Block and Verbatim-Paste Mandate

The `apply_change` MCP tool and engine MUST NOT emit `## NN Agent Modification` markdown blocks or require agents to verbatim-paste markdown text into chat replies. The tool MUST return a structured JSON result containing:
- `changeset`: path to the changeset file
- `status`: `"applied"` or failure status
- `models`: dictionary of affected models and their version transitions (`base_version`, `result_version`)
- `applied_changes`: count and identifiers of successfully applied changes

#### Scenario: Structured return replaces modification text
- GIVEN an execution of `apply_change`
- WHEN the mutation completes successfully
- THEN the return payload is a structured JSON response
- AND the payload does not contain an `## NN Agent Modification` markdown block or verbatim paste instructions

### Requirement: Proposal-time evidence citation

At intake, after the proposal is sealed or its seal verified and before Phase 1, the apply engine MUST resolve the `sources` citation of every change with the workspace citation resolver (resolved against the domain root, so `sources/`, `kNNowledge/` and `changes/` targets are all valid). If any citation does not resolve to an existing file and anchor, the engine MUST reject the whole changeset with `CITATION_UNRESOLVED`, listing each offending change id and citation; it MUST release the lock and write nothing. The engine MUST NOT add, remove or rewrite a change's `sources::` line at any point; the D20 citation rewrite applies to model fields only.

#### Scenario: An unresolvable citation rejects the changeset
- GIVEN a changeset whose change `c-02` has `sources:: sources/import/missing.md@## Needs`
- WHEN `apply_change` runs
- THEN it fails with `CITATION_UNRESOLVED` naming `c-02` and the citation
- AND no model, changeset or temporary file is written
- AND `changes/.lock` is released

#### Scenario: A resolving citation is left untouched
- GIVEN a changeset whose change `c-01` has `sources:: sources/import/dataset.csv@m-001` and the row exists
- WHEN `apply_change` applies it
- THEN the change applies
- AND the `sources::` line of `c-01` in the written-back changeset is byte-identical to the input

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

