# Changeset Conflicts Specification

## Purpose

Specify conflict detection, per-change partitioning, clean-subset execution, `partially_applied` status semantics, and replay idempotency for changeset application (Decision D10).

## Requirements

### Requirement: Per-Change Conflict Partitioning (Clean Subset)

When applying a changeset, the engine MUST evaluate preconditions for each change item individually:
- Precondition evaluations include `from` value mismatches, missing target elements, invalid references, and stale targets.
- If one or more change items encounter a conflict, the engine MUST NOT abort the entire changeset.
- The engine MUST partition the changes into a clean subset and a conflicted subset.
- The clean subset MUST be applied atomically to live models in Phase 1 and committed in Phase 2.
- Conflicted changes MUST be skipped and excluded from in-memory mutations.
- If all changes in a changeset are conflicted or rejected, the engine MUST NOT stage or write any model files to disk.

#### Scenario: Mixed changeset applies clean subset and skips conflict
- GIVEN a changeset with Change 1 (`update_field` matching live value) and Change 2 (`update_field` with mismatched `from`)
- WHEN `apply_change` executes
- THEN Change 1 is applied to the live model in-memory and committed to disk
- AND Change 2 is skipped with zero mutation to its target field
- AND the transaction succeeds with status `partially_applied`

#### Scenario: All-conflicted changeset makes zero disk writes
- GIVEN a changeset where all changes have precondition mismatches
- WHEN `apply_change` executes
- THEN zero models are mutated, staged, or renamed on disk
- AND the transaction completes with status `conflict` and applied count 0

---

### Requirement: Execution Annotations and Status Semantics (`partially_applied`)

The engine MUST annotate each change item in the changeset file on disk upon completion:
- Successfully applied changes MUST be annotated with `status:: applied` and `resolution:: Applied successfully`.
- Conflicted changes MUST be annotated with `status:: conflict` and `resolution:: <diagnostic message>` describing the failure reason.
- Frontmatter `status` MUST be set according to the overall batch outcome:
  - `applied`: when all non-comment changes succeed.
  - `partially_applied`: when at least one change is applied AND at least one change is conflicted.
  - `conflict`: when zero changes are applied and at least one change is conflicted.
- Frontmatter `applied_at` MUST record the ISO-8601 timestamp whenever status is `applied` or `partially_applied`.
- Frontmatter `models` MUST record version transitions (`base_version` and `result_version`) ONLY for models touched by the clean subset. Models with zero applied changes MUST NOT be recorded and MUST NOT have their versions bumped.

#### Scenario: Partially applied changeset records mixed annotations
- GIVEN a changeset modifying model `strategy` cleanly and model `roadmap` with a conflict
- WHEN `apply_change` completes Phase 2
- THEN frontmatter `status` is set to `partially_applied`
- AND frontmatter `models` contains entry for `strategy` but not `roadmap`
- AND Change 1 carries `status:: applied` with `resolution:: Applied successfully`
- AND Change 2 carries `status:: conflict` with a diagnostic resolution

#### Scenario: Untouched models retain version and emit no snapshot
- GIVEN a changeset with changes targeting model A (clean) and model B (conflicted)
- WHEN `apply_change` completes
- THEN model A's `knowledge_version` bumps by patch and creates an archive snapshot
- AND model B's `knowledge_version` remains unchanged with no archive snapshot

---

### Requirement: Replay Idempotency and Resolution via New Changeset

Applying a previously executed changeset MUST be an idempotent no-op:
- When `apply_change` is invoked on a changeset with frontmatter `status: "applied"` or `status: "partially_applied"`, the engine MUST check current model versions against recorded `result_version` entries in `models`.
- If all recorded models match their `result_version`, the engine MUST return success with the existing status, `appliedCount: 0`, and an idempotent replay warning.
- The engine MUST NOT re-evaluate or re-attempt previously conflicted changes during replay.
- Conflicted changes in a `partially_applied` changeset MUST ONLY be resolved by authoring and applying a NEW changeset citing the original change or changeset.

#### Scenario: Replay of partially_applied changeset is a safe no-op
- GIVEN a changeset on disk with frontmatter `status: partially_applied` and recorded `result_version` for `strategy`
- AND `kNNowledge/strategy_NN.md` currently has `knowledge_version` equal to that `result_version`
- WHEN `apply_change` is invoked again on that changeset file
- THEN the engine returns status `partially_applied` with `appliedCount: 0`
- AND no disk mutations, version bumps, or duplicate snapshots occur

#### Scenario: Conflicted change cannot be re-applied in place
- GIVEN a changeset with one change marked `status:: conflict`
- WHEN the user or agent re-invokes `apply_change` on the same changeset after correcting the model
- THEN the engine treats the invocation as an idempotent replay
- AND does not execute the conflicted change until submitted under a new changeset
