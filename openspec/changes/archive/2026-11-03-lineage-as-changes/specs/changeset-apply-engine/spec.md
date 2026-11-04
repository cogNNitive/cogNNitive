# Changeset Apply Engine Specification (delta)

## ADDED Requirements

### Requirement: Execution facts are stamped at apply

For every applied change the engine MUST stamp `resolved_target` and, when evidence entries are file citations, `evidence_sha256` (one sha per entry in evidence order), as per-change annotation lines outside the seal. `resolved_target` MUST be computed from the model slug and the frozen slugs of the unit as resolved at apply time (so a target addressed by a display name or a renamed name is stamped with its frozen slug form). A `produce_artifact` change MUST be stamped with the artifact path as `resolved_target` and MUST NOT be associated with any model. A conflicted or rejected change MUST be stamped with neither.

#### Scenario: Target addressed by name is stamped with the frozen slug
- GIVEN an element named `Alpha` with slug `alpha` renamed to `Beta`, and an `update_field` addressing `Beta`
- WHEN it is applied
- THEN `resolved_target` is `m@alpha&owner`

#### Scenario: Conflicted change has no facts
- GIVEN a change annotated `status:: conflict`
- WHEN the changeset is written back
- THEN it carries no `resolved_target` and no `evidence_sha256`

#### Scenario: Evidence sha is the sha of the cited file
- GIVEN a change citing `sources/import/a.md@## One`
- WHEN it is applied
- THEN `evidence_sha256` equals the sha256 of the bytes of `sources/import/a.md`

## MODIFIED Requirements

### Requirement: Two-Phase Apply Transaction

The apply engine MUST execute mutations using a strict two-phase transactional lifecycle:

1. **Phase 1: In-Memory Compute and Validate**:
   - The engine MUST seal a changeset whose frontmatter omits `proposal_sha` at intake (compute `computeProposalSha` over the parsed changes and write it back) before verification; a `proposal_sha` that is present but does not match MUST be rejected with `PROPOSAL_TAMPERED`.
   - The engine MUST partition the changes per change (see `changeset-conflicts`): a change whose precondition fails (`from` mismatch, missing target, stale `base_hash`, reference conflict) is annotated `status:: conflict` and skipped; it does not abort the clean changes.
   - Mutations MUST be applied to in-memory ASTs of target models. Mutations MUST NOT write any citation into a model: no `sources::` line and no `<field>_source` companion field is created or rewritten. Provenance lives only in the change `evidence`.
   - For each applied change the engine MUST compute the execution facts `resolved_slug` (where a slug was assigned), `resolved_target` and `evidence_sha256` (see "Execution facts are stamped at apply").
   - The engine MUST bump `knowledge_version` in the frontmatter of each affected model exactly once (per `knowledge-version-and-snapshot`): patch by default, or the level requested by a `bump_version` change. A `produce_artifact` change touches no model and bumps nothing.
   - The engine MUST run full schema validation (`validateKnowledge`) on all touched models against their blueprints. If any validation error occurs, the transaction MUST abort before Phase 2: the lock MUST be released, zero model files MUST be written or renamed, and the result MUST carry `status: rejected` with errors coded `VALIDATION_FAILED`. The rejection is persisted in the changeset (see "Rejected changesets are persisted"); the engine does not throw.
   - The engine MUST compute the changeset write-back bytes and pass the proposal immutability assertion before Phase 2 starts.

2. **Phase 2: Atomic Persistence**:
   - For each touched model, the mutated content MUST be written to `<rootDir>/kNNowledge/<model_stem>.tmp` and then renamed over `<rootDir>/kNNowledge/<model_stem>_NN.md` (see "Crash-safe persist"). No copy of the previous model is written anywhere.
   - The changeset document on disk MUST be updated through the raw-text-preserving serializer with:
     - Frontmatter `status: applied` (or `partially_applied`), `applied_at: <ISO-timestamp>`, and `models: { [slug]: { base_version, result_version } }`.
     - Each change element annotated with `status::`, `resolution::`, `resolved_slug::` where a slug was assigned, `resolved_target::` and `evidence_sha256::` where evidence is a file citation.
   - The lock `changes/.lock` MUST be released.
(Previously: Phase 1 rewrote model citations on `update_field` and `add_element` (D20) and recorded `replaced_sources::`; the annotation set had no `resolved_target` or `evidence_sha256`.)

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
- AND Phase 2 writes `strategy.tmp` and renames it to `kNNowledge/strategy_NN.md`
- AND no `kNNowledge/archive/` directory exists
- AND the changeset file is updated with `status: applied` and per-change `status:: applied` annotations
- AND lock is released

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

#### Scenario: No citation is written into the model
- GIVEN an `update_field` on a field of element `goal-1`
- WHEN the changeset is applied
- THEN the model gains no `sources::` line and no `owner_source` companion field
- AND the change carries no `replaced_sources::` annotation

### Requirement: Proposal-time evidence citation

At intake, after the proposal is sealed or its seal verified and before Phase 1, the apply engine MUST resolve every entry of the `evidence` of every change with the workspace citation resolver (resolved against the domain root, so `sources/`, `kNNowledge/` and `changes/` targets are all valid). The entries `decision` and `unknown` MUST NOT be resolved. A list MUST be resolved entry by entry. If any citation does not resolve to an existing file and anchor, the engine MUST reject the whole changeset with `CITATION_UNRESOLVED`, naming the offending change id and citation; it MUST release the lock and write no model; the rejection itself is not persisted (a workspace-dependent cause, see "Rejected changesets are persisted"). The engine MUST NOT add, remove or rewrite a change's `evidence::` line at any point. `unknown` evidence MUST NOT reject the changeset (it is reported as `EVIDENCE_UNKNOWN` by the validator).
(Previously: single `sources` citation, rewrite of model citations (D20), and persisted rejection text.)

#### Scenario: An unresolvable citation rejects the changeset
- GIVEN a changeset whose change `c-02` has `evidence:: sources/import/missing.md@## Needs`
- WHEN `apply_change` runs
- THEN it fails with `CITATION_UNRESOLVED` naming `c-02` and the citation
- AND no model or temporary file is written
- AND `changes/.lock` is released

#### Scenario: One bad entry of a list rejects the changeset
- GIVEN `evidence:: [sources/import/a.md@## One, sources/import/missing.md]` where `a.md` exists
- WHEN `apply_change` runs
- THEN it fails with `CITATION_UNRESOLVED` naming the missing entry

#### Scenario: A resolving citation is left untouched
- GIVEN a changeset whose change `c-01` has `evidence:: sources/import/dataset.csv@m-001` and the row exists
- WHEN `apply_change` applies it
- THEN the change applies
- AND the `evidence::` line of `c-01` in the written-back changeset is byte-identical to the input

#### Scenario: Keywords are not resolved
- GIVEN a change with `evidence:: decision` and another with `evidence:: unknown`
- WHEN `apply_change` runs
- THEN neither is resolved against the filesystem and both apply

### Requirement: Proposal immutability on apply

Applying a changeset MUST NOT alter any normative line of the proposal. Before Phase 2 (and before the write-back on the conflict path), the engine MUST compare, for every change block, the normative lines of the bytes it is about to write — every line except the execution annotations `status::`, `resolution::`, `resolved_slug::`, `resolved_target::` and `evidence_sha256::` — with the input; any difference MUST abort with `PROPOSAL_IMMUTABILITY_VIOLATION`, writing nothing and releasing the lock. Execution facts MUST be recorded only in the frontmatter execution keys and the per-change annotations; no outcome section MAY be appended to the document. (Previously: the annotation `replaced_sources::` was excluded instead of the two new facts.)

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

### Requirement: Rejected changesets are persisted

When the apply engine rejects a changeset because of a defect of the proposal itself, it MUST persist the rejection: frontmatter `status: rejected` and a frontmatter `resolution` stating why, plus `status:: rejected` and `resolution::` on the offending change when one is identifiable. The write-back MUST start from the raw text of the proposal, so execution annotations computed in memory during the failed run are never written, and it MUST keep every normative line byte-identical. Only causes intrinsic to the proposal are persisted: a mutation that can never apply as written (`MUTATION_FAILED`), a malformed `add_model` set (`ADD_MODEL_INVALID_TARGET`, `ADD_MODEL_DUPLICATE`, `ADD_MODEL_ORDER`), an invalid maintenance change (`LEVEL3_ONLY`, `INVALID_BUMP_LEVEL`, `BUMP_ON_CREATED_MODEL`), an unbumpable base version (`INVALID_VERSION`), inline field values on a change (`INLINE_FIELDS_REJECTED`) and a keyword mixed into an evidence list (`EVIDENCE_KEYWORD_IN_LIST`).

Causes that depend on workspace state are returned with `status: rejected` but NOT recorded; the file stays `proposed` and can be retried once the workspace changes: an unresolved evidence citation (`CITATION_UNRESOLVED`, the source may not be imported yet), a missing artifact path of a `produce_artifact` (`ARTIFACT_NOT_FOUND`) and a failed schema validation of a touched model (`VALIDATION_FAILED`, the model may already have been invalid).

The engine MUST NOT write anything for failures that are not a property of the proposal: `PROPOSAL_TAMPERED`, `PROPOSAL_IMMUTABILITY_VIOLATION`, lock contention (`CONCURRENT_APPLY_ACTIVE`), an unreadable or unparseable changeset, a path outside the domain, a missing model, or an unresolvable bluepriNNt (`BLUEPRINT_UNRESOLVED`, `BLUEPRINT_INVALID`, `DOMAIN_LAYOUT_INVALID`).

A changeset recorded as `rejected` whose content is unchanged (its `proposal_sha` still matches) MUST NOT be re-applied: `apply_change` MUST return `success: false`, `status: rejected` and an error `CHANGESET_REJECTED` carrying the recorded `resolution`, and MUST write nothing. A rejected changeset whose content was edited (seal mismatch or removed) is re-sealed at intake and re-enters apply, like a `conflict` re-proposal; its stale `resolution` and per-change rejection annotations are cleared. (`init_knowledge` deletes its own rejected proposal because a failed creation is not a record worth keeping.)
(Previously: `RECORD_UNVERSIONED` was an intrinsic cause; the new codes did not exist.)

#### Scenario: A rejection is recorded
- GIVEN a changeset whose change `c-01` is refused by the mutation engine
- WHEN `apply_change` runs
- THEN the result has `status: rejected` and an error `MUTATION_FAILED`
- AND the changeset file has `status: rejected`, a `resolution` containing the reason, and `status:: rejected` on the offending change

#### Scenario: An unchanged rejection is final
- GIVEN a changeset recorded as `rejected` because a mutation was refused
- WHEN `apply_change` runs again without editing it
- THEN the result is `CHANGESET_REJECTED` with the recorded reason
- AND no model and no changeset byte changes

#### Scenario: An edited rejection is retried
- GIVEN a changeset recorded as `rejected`
- WHEN its operations are corrected and `apply_change` runs again
- THEN the changeset is re-sealed and applied, and no stale `resolution` remains

#### Scenario: Workspace-dependent failures are not recorded
- GIVEN a change citing a source that is not imported yet
- WHEN `apply_change` runs, and again after the source exists
- THEN the first call returns `CITATION_UNRESOLVED` with the file still `proposed`
- AND the second call applies it

#### Scenario: Earlier in-memory work does not leak
- GIVEN a changeset whose `c-01` applies in memory and whose `c-02` is refused by the mutation engine
- WHEN `apply_change` runs
- THEN `c-01` carries no `status::` annotation in the file and `c-02` carries `status:: rejected`

#### Scenario: Tamper is not recorded
- GIVEN a changeset edited after sealing
- WHEN `apply_change` runs
- THEN it fails with `PROPOSAL_TAMPERED` and the file keeps `status: proposed` and its bytes

#### Scenario: Inline fields are an intrinsic defect
- GIVEN a sealed changeset whose `add_element` carries inline fields
- WHEN `apply_change` runs
- THEN the changeset is recorded `rejected` with `INLINE_FIELDS_REJECTED`

### Requirement: Error codes as returned

`apply_change` MUST report failures through the result, not by throwing. The codes it returns are: `CONCURRENT_APPLY_ACTIVE` (lock held), `PROPOSAL_TAMPERED`, `PROPOSAL_IMMUTABILITY_VIOLATION`, `CHANGESET_REJECTED`, `CITATION_UNRESOLVED`, `MUTATION_FAILED`, `VALIDATION_FAILED`, `BLUEPRINT_UNRESOLVED`, `BLUEPRINT_INVALID`, `DOMAIN_LAYOUT_INVALID`, `MODEL_EXISTS`, `ADD_MODEL_INVALID_TARGET`, `ADD_MODEL_DUPLICATE`, `ADD_MODEL_ORDER`, `LEVEL3_ONLY`, `INVALID_BUMP_LEVEL`, `BUMP_ON_CREATED_MODEL`, `INVALID_VERSION`, `SCHEMA_OP_ON_LEVEL3`, `UNKNOWN_OPERATION`, `ADD_MODEL_REQUIRES_CHANGESET`, `INLINE_FIELDS_REJECTED`, `EVIDENCE_KEYWORD_IN_LIST` and `ARTIFACT_NOT_FOUND`. Per-change conflicts are annotations (`PRECONDITION_FAILED`, `STALE_TARGET_DELETED`, `STALE_BASE_HASH`, `REFERENCED_BY`, `EMPTY_SLUG`, `MODEL_EXISTS`, `DEPENDS_ON_CONFLICTED_CHANGE`, `ARTIFACT_ALREADY_RECORDED`) and surface as result errors only when every actionable change conflicted. The result `status` is one of `applied`, `partially_applied`, `conflict` or `rejected`. `RECORD_UNVERSIONED` MUST NOT exist.

#### Scenario: Validation failure is a result, not an exception
- GIVEN a changeset that produces an invalid model
- WHEN `apply_change` runs
- THEN the call resolves with `success: false`, `status: rejected` and errors coded `VALIDATION_FAILED`
- AND no exception is thrown

### Requirement: Direct `apply_change` operations are a closed, classified set
The `apply_change` tool MUST accept an operation only if it is a changeset `ChangeOp` (including `freeze_slugs`, `bump_version`, `update_concept_field`, `remove_matrix`, `update_element_text`, `add_matrix` and `produce_artifact`), the direct maintenance operation `generate_index` or a direct schema operation (`add_concept`, `add_field`). Any other operation, including the removed `set_marker`, MUST fail with `UNKNOWN_OPERATION` and write nothing.

Rule: anything that mutates a Level-3 kNNowledge model is a changeset operation, so that it is sealed, recorded, versioned and citable. A bare call of a changeset operation is synthesized into a one-change changeset and applied through the normal path; a synthesized change that carries no evidence is written with `evidence:: unknown`. Only operations that cannot touch Level-3 content stay direct:
- `generate_index` writes the derived index of a Level-2 bluepriNNt and refuses a Level-3 model.
- `add_concept` and `add_field` author Level-2 bluepriNNt primitives (traced by git and the bluepriNNt version). On a Level-3 model they have no meaning and MUST fail with `SCHEMA_OP_ON_LEVEL3`, writing nothing.
- `bump_version` on a Level-2 bluepriNNt sets `blueprint_version` in place (`{ bump }` or `{ version }`) after the bluepriNNt validates (`validate_blueprint`). A bluepriNNt that does not validate is refused and not written, and the live filename never changes.
- `freeze_slugs` on a model whose elements all carry explicit slugs is an applied no-op: the change is annotated `Slugs already frozen; nothing to do`, the model is not touched and its version is not bumped.
- `bump_version` on a model created by `add_model` in the same changeset is refused with `BUMP_ON_CREATED_MODEL` (set the initial `knowledge_version` on `add_model`). A base version that cannot be bumped is refused with `INVALID_VERSION`. A bump is never reported applied and then skipped.
- `freeze_slugs` and `bump_version` on a Level-3 model are changeset operations. `freeze_slugs` writes `slug::` lines into kNNowledge content. `bump_version` carries its level (`patch`, `minor` or `major`, default `patch`) in `to`. An explicit `version` is refused with `INVALID_BUMP_LEVEL`, and a non-Level-3 target of either op is refused with `LEVEL3_ONLY`.

The apply engine MUST bump a touched model exactly once. A `bump_version` change replaces the default patch bump for its model; when several are present, the highest requested level wins. It MUST NOT add a bump on top. A higher level resets the lower ones (`V_0-1-3` minor gives `V_0-2-0`). The legacy rename of the model file to a `_V_x-y-z_` name and the cascade of renamed references are removed: live filenames are invariant.
(Previously: the unversioned lineage record was refused with `RECORD_UNVERSIONED`; the closed set did not list the three new operations.)

#### Scenario: Level-3 maintenance operation is a changeset
- GIVEN a Level-3 model `acme` at `knowledge_version: "V_0-1-0"`
- WHEN `apply_change` runs `bump_version` with `{ bump: "minor" }` on `acme`
- THEN one applied changeset with a `bump_version` change is written under `changes/`
- AND `kNNowledge/acme_NN.md` has `knowledge_version: "V_0-2-0"` (not `V_0-2-1`)
- AND replaying the changeset changes nothing

#### Scenario: freeze_slugs on a Level-3 model is a changeset
- GIVEN a Level-3 model whose elements have no explicit slugs
- WHEN `apply_change` runs `freeze_slugs` on it
- THEN a changeset is recorded, the slugs are written, and the version is bumped once by patch

#### Scenario: Schema authoring is refused on a Level-3 model
- GIVEN a Level-3 model `acme`
- WHEN `apply_change` runs `add_concept`
- THEN it fails with `SCHEMA_OP_ON_LEVEL3`, no changeset is written and the model is byte-identical

#### Scenario: Level-2 bump stays direct
- GIVEN a Level-2 bluepriNNt document `tpl`
- WHEN `apply_change` runs `bump_version` with `{ bump: "minor" }` on `tpl`
- THEN its `blueprint_version` is raised in place and no changeset is written under `changes/`

#### Scenario: Content operation is synthesized as a changeset
- GIVEN a model `acme` with an element `risk-1`
- WHEN `apply_change` runs a content operation (for example `update_field`) with `id` and `args`
- THEN one applied changeset is written under `changes/`
- AND, when no evidence was supplied, its change carries `evidence:: unknown`

#### Scenario: Unclassified operation is rejected
- GIVEN an operation name that is neither a `ChangeOp` nor in the maintenance or schema lists
- WHEN `apply_change` receives it
- THEN it fails with `UNKNOWN_OPERATION` and no file is changed

#### Scenario: Removed operation is rejected
- GIVEN the operation name `set_marker`
- WHEN `apply_change` receives it, on a Level-2 or a Level-3 target
- THEN it fails with `UNKNOWN_OPERATION` (not `SCHEMA_OP_ON_LEVEL3`) and no file is changed

#### Scenario: Partition is exhaustive
- GIVEN the set of operations the engine implements
- WHEN the classification test compares it with `ChangeOp`, the maintenance list and the schema list
- THEN every implemented operation belongs to exactly one list

#### Scenario: No record guard exists
- GIVEN a `bump_version` on a file named `Acme_cogNNitive_NN.md`
- WHEN `apply_change` runs
- THEN no `RECORD_UNVERSIONED` refusal exists; the file is treated like any other document
