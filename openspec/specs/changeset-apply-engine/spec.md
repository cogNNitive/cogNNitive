# Changeset Apply Engine Specification

## Purpose

Specify the transactional mutation engine (`apply_change`) that applies changesets to live domain models. The engine enforces single-writer mutual exclusion via `changes/.lock`, executes a two-phase transaction (validate in-memory, stage `.tmp`, rename), partitions each changeset into clean and conflicted changes, persists rejections of invalid proposals, ensures replay idempotency, annotates changeset resolution, and retires legacy modification blocks. History is the changeset chain plus each change's `replaced_sources`; no snapshot of a prior model is written.
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
   - The engine MUST partition the changes per change (see `changeset-conflicts`): a change whose precondition fails (`from` mismatch, missing target, stale `base_hash`, reference conflict) is annotated `status:: conflict` and skipped; it does not abort the clean changes.
   - Mutations MUST be applied to in-memory ASTs of target models.
   - Only `update_field` and `add_element` rewrite citations: they cite the applied change (per `field-citation-provenance` / D20), and `update_field` records the replaced citation in the change's `replaced_sources::` annotation.
   - The engine MUST bump `knowledge_version` in the frontmatter of each affected model exactly once (per `knowledge-version-and-snapshot`): patch by default, or the level requested by a `bump_version` change.
   - The engine MUST run full schema validation (`validateKnowledge`) on all touched models against their blueprints. If any validation error occurs, the transaction MUST abort before Phase 2: the lock MUST be released, zero model files MUST be written or renamed, and the result MUST carry `status: rejected` with errors coded `VALIDATION_FAILED`. The rejection is persisted in the changeset (see "Rejected changesets are persisted"); the engine does not throw.
   - The engine MUST compute the changeset write-back bytes and pass the proposal immutability assertion before Phase 2 starts.

2. **Phase 2: Atomic Persistence**:
   - For each touched model, the mutated content MUST be written to `<rootDir>/kNNowledge/<model_stem>.tmp` and then renamed over `<rootDir>/kNNowledge/<model_stem>_NN.md` (see "Crash-safe persist"). No copy of the previous model is written anywhere.
   - The changeset document on disk MUST be updated through the raw-text-preserving serializer with:
     - Frontmatter `status: applied` (or `partially_applied`), `applied_at: <ISO-timestamp>`, and `models: { [slug]: { base_version, result_version } }`.
     - Each change element annotated with `status::`, `resolution::`, `resolved_slug::` where a slug was assigned, and `replaced_sources::` where a citation was replaced.
   - The lock `changes/.lock` MUST be released.
(Previously: Phase 2 copied the previous model into `kNNowledge/archive/` before the rename, and the changeset was re-rendered from the parsed object.)

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
- When `apply_change` is invoked on a changeset with frontmatter `status: "applied"` or `"partially_applied"`, the engine MUST check the current `knowledge_version` of each model listed in the changeset's `models` map against the recorded `result_version`.
- If all target models already match their recorded `result_version`, the engine MUST return a successful execution report without executing mutations, without bumping versions again, and without writing any file.
- If target model versions have advanced beyond `result_version` or diverge, the engine MUST return a status indicating the changeset is already applied and no mutation was performed.
A changeset with `status: rejected` MUST NOT be re-applied (see "Rejected changesets are persisted").

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

At intake, after the proposal is sealed or its seal verified and before Phase 1, the apply engine MUST resolve the `sources` citation of every change with the workspace citation resolver (resolved against the domain root, so `sources/`, `kNNowledge/` and `changes/` targets are all valid). If any citation does not resolve to an existing file and anchor, the engine MUST reject the whole changeset with `CITATION_UNRESOLVED`, naming the offending change id and citation; it MUST release the lock and write no model; the rejection itself is persisted in the changeset (see "Rejected changesets are persisted"). The engine MUST NOT add, remove or rewrite a change's `sources::` line at any point; the D20 citation rewrite applies to model fields only.

#### Scenario: An unresolvable citation rejects the changeset
- GIVEN a changeset whose change `c-02` has `sources:: sources/import/missing.md@## Needs`
- WHEN `apply_change` runs
- THEN it fails with `CITATION_UNRESOLVED` naming `c-02` and the citation
- AND no model or temporary file is written
- AND the changeset records `status: rejected` and a `resolution` naming the citation
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

Conflict semantics: an `add_model` change has no `base_hash` and no `from`. When a model
with the target id already exists, the change MUST be partitioned as a conflict with code
`MODEL_EXISTS`, and every other change in the changeset targeting that id MUST be
conflicted with `DEPENDS_ON_CONFLICTED_CHANGE`. A change targeting a model created by a
later `add_model` MUST be rejected (`ADD_MODEL_ORDER`), as MUST two `add_model` changes
with the same target.

The created model MUST NOT be version-bumped in the same apply; its `models` entry MUST
carry only `result_version` (no `base_version`). It MUST pass the same schema validation
pass as every touched model. Persistence MUST write `kNNowledge/<id>_NN.md` through a
temporary file renamed into place after re-checking, inside the lock, that the target is
still absent, with no archive copy; a domain without `kNNowledge/` MUST be rejected with
`DOMAIN_LAYOUT_INVALID`. After the commit, outside the lock, the `apply_change` handler
MUST reconcile the domain manifest (`sync_domain_manifest`, non-dry) and report it as
`manifest`; a reconciliation failure MUST NOT alter the apply outcome.

#### Scenario: Creates a valid Level-3 document
- GIVEN a domain created by `init_domain` and a sealed changeset with one `add_model` for `acme` on the `business` bluepriNNt
- WHEN `apply_change` runs
- THEN `kNNowledge/acme_NN.md` exists
- AND `validate_knowledge` on it returns `valid: true`
- AND the changeset `models.acme` has a `result_version` and no `base_version`

#### Scenario: Fails on an existing model
- GIVEN model `strategy` exists
- WHEN a changeset with `add_model` targeting `strategy` and an `add_element` targeting `strategy` is applied
- THEN both changes are conflicted (`MODEL_EXISTS`, `DEPENDS_ON_CONFLICTED_CHANGE`)
- AND `strategy_NN.md` is byte-identical to before

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

### Requirement: Concept conformance at `add_element` mutation time

For every `add_element` change, the engine MUST pass the resolved bluepriNNt schema to the
mutation, so an undeclared concept is rejected when the mutation runs (unknown-concept
error listing the declared concepts), not only by the post-mutation schema validation.
When the bluepriNNt cannot be resolved, the change MUST be rejected with
`BLUEPRINT_UNRESOLVED`; the schema-less mutation path MUST NOT be used by changeset
apply.

#### Scenario: Bad concept rejected at mutation
- GIVEN a changeset with `add_element` targeting `strategy` with `concept:: Unicorn`, undeclared in its bluepriNNt
- WHEN `apply_change` runs
- THEN the change fails with an unknown-concept error naming `Unicorn` raised by the mutation
- AND no model file is written

#### Scenario: Declared concept accepted
- GIVEN `add_element` with a concept declared by the bluepriNNt (case-insensitive)
- WHEN `apply_change` runs
- THEN the element is added

### Requirement: `init_knowledge` is an `add_model` wrapper

`init_knowledge` MUST build a one-change `add_model` changeset from its arguments, write
it with the shared proposed-changeset writer and apply it through the normal apply path,
so that every model creation is recorded as a change. It MUST be create-only: an existing
id MUST fail with `MODEL_EXISTS` and the existing file MUST be untouched. It MUST NOT
repair, rewrite the frontmatter of, or preserve the body of an existing document, and
MUST NOT write a frontmatter-only document when the bluepriNNt cannot be resolved. Its
description MUST NOT mention repair or a `VERSION_MISMATCH` refusal. For the same inputs
the created document MUST be byte-identical to the document `init_knowledge` wrote before
this change. It MUST regenerate the console and return `next_steps` like `apply_change`.

#### Scenario: Wrapper produces an add_model changeset
- GIVEN an empty domain
- WHEN `init_knowledge` runs for `acme` on the `business` bluepriNNt with `open: false`
- THEN `changes/` holds one applied changeset with a single `add_model` change targeting `acme`
- AND the result carries `filePath`, `content` and `changeset`

#### Scenario: Same document as before
- GIVEN the golden output of the previous `init_knowledge` for fixed inputs
- WHEN the wrapper runs with the same inputs
- THEN the created model file is byte-identical to the golden output

#### Scenario: Existing id is not repaired
- GIVEN `kNNowledge/acme_NN.md` exists with a broken frontmatter
- WHEN `init_knowledge` runs for `acme`
- THEN it fails with `MODEL_EXISTS` and the file is byte-identical to before

### Requirement: Rejected changesets are persisted

When the apply engine rejects a changeset because of a defect of the proposal itself, it MUST persist the rejection: frontmatter `status: rejected` and a frontmatter `resolution` stating why, plus `status:: rejected` and `resolution::` on the offending change when one is identifiable. The write-back MUST start from the raw text of the proposal, so execution annotations computed in memory during the failed run are never written, and it MUST keep every normative line byte-identical. Only causes intrinsic to the proposal are persisted: a mutation that can never apply as written (`MUTATION_FAILED`), a malformed `add_model` set (`ADD_MODEL_INVALID_TARGET`, `ADD_MODEL_DUPLICATE`, `ADD_MODEL_ORDER`), an invalid maintenance change (`LEVEL3_ONLY`, `RECORD_UNVERSIONED`, `INVALID_BUMP_LEVEL`, `BUMP_ON_CREATED_MODEL`) and an unbumpable base version (`INVALID_VERSION`).

Causes that depend on workspace state are returned with `status: rejected` but NOT recorded; the file stays `proposed` and can be retried once the workspace changes: an unresolved evidence citation (`CITATION_UNRESOLVED`, the source may not be imported yet) and a failed schema validation of a touched model (`VALIDATION_FAILED`, the model may already have been invalid).

The engine MUST NOT write anything for failures that are not a property of the proposal: `PROPOSAL_TAMPERED`, `PROPOSAL_IMMUTABILITY_VIOLATION`, lock contention (`CONCURRENT_APPLY_ACTIVE`), an unreadable or unparseable changeset, a path outside the domain, a missing model, or an unresolvable bluepriNNt (`BLUEPRINT_UNRESOLVED`, `BLUEPRINT_INVALID`, `DOMAIN_LAYOUT_INVALID`).

A changeset recorded as `rejected` whose content is unchanged (its `proposal_sha` still matches) MUST NOT be re-applied: `apply_change` MUST return `success: false`, `status: rejected` and an error `CHANGESET_REJECTED` carrying the recorded `resolution`, and MUST write nothing. A rejected changeset whose content was edited (seal mismatch or removed) is re-sealed at intake and re-enters apply, like a `conflict` re-proposal; its stale `resolution` and per-change rejection annotations are cleared. (`init_knowledge` deletes its own rejected proposal because a failed creation is not a record worth keeping.)

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

### Requirement: Error codes as returned

`apply_change` MUST report failures through the result, not by throwing. The codes it returns are: `CONCURRENT_APPLY_ACTIVE` (lock held), `PROPOSAL_TAMPERED`, `PROPOSAL_IMMUTABILITY_VIOLATION`, `CHANGESET_REJECTED`, `CITATION_UNRESOLVED`, `MUTATION_FAILED`, `VALIDATION_FAILED`, `BLUEPRINT_UNRESOLVED`, `BLUEPRINT_INVALID`, `DOMAIN_LAYOUT_INVALID`, `MODEL_EXISTS`, `ADD_MODEL_INVALID_TARGET`, `ADD_MODEL_DUPLICATE`, `ADD_MODEL_ORDER`, `LEVEL3_ONLY`, `RECORD_UNVERSIONED`, `INVALID_BUMP_LEVEL`, `BUMP_ON_CREATED_MODEL`, `INVALID_VERSION`, `SCHEMA_OP_ON_LEVEL3`, `UNKNOWN_OPERATION` and `ADD_MODEL_REQUIRES_CHANGESET`. Per-change conflicts are annotations (`PRECONDITION_FAILED`, `STALE_TARGET_DELETED`, `STALE_BASE_HASH`, `REFERENCED_BY`, `EMPTY_SLUG`, `MODEL_EXISTS`, `DEPENDS_ON_CONFLICTED_CHANGE`) and surface as result errors only when every actionable change conflicted. The result `status` is one of `applied`, `partially_applied`, `conflict` or `rejected`.

#### Scenario: Validation failure is a result, not an exception
- GIVEN a changeset that produces an invalid model
- WHEN `apply_change` runs
- THEN the call resolves with `success: false`, `status: rejected` and errors coded `VALIDATION_FAILED`
- AND no exception is thrown

### Requirement: Direct `apply_change` operations are a closed, classified set
The `apply_change` tool MUST accept an operation only if it is a changeset `ChangeOp` (including `freeze_slugs`, `bump_version`, `update_concept_field` and `remove_matrix`), the direct maintenance operation `generate_index` or a direct schema operation (`add_concept`, `add_field`). Any other operation, including the removed `set_marker`, MUST fail with `UNKNOWN_OPERATION` and write nothing.

Rule: anything that mutates a Level-3 kNNowledge model is a changeset operation, so that it is sealed, recorded, versioned and citable. A bare call of a changeset operation is synthesized into a one-change changeset and applied through the normal path. Only operations that cannot touch Level-3 content stay direct:
- `generate_index` writes the derived index of a Level-2 bluepriNNt and refuses a Level-3 model.
- `add_concept` and `add_field` author Level-2 bluepriNNt primitives (traced by git and the bluepriNNt version). On a Level-3 model they have no meaning and MUST fail with `SCHEMA_OP_ON_LEVEL3`, writing nothing.
- `bump_version` on a Level-2 bluepriNNt sets `blueprint_version` in place (`{ bump }` or `{ version }`) after the bluepriNNt validates (`validate_blueprint`). A bluepriNNt that does not validate is refused and not written, and the live filename never changes.
- `freeze_slugs` on a model whose elements all carry explicit slugs is an applied no-op: the change is annotated `Slugs already frozen; nothing to do`, the model is not touched and its version is not bumped.
- `bump_version` on a model created by `add_model` in the same changeset is refused with `BUMP_ON_CREATED_MODEL` (set the initial `knowledge_version` on `add_model`). A base version that cannot be bumped is refused with `INVALID_VERSION`. A bump is never reported applied and then skipped.
- `freeze_slugs` and `bump_version` on a Level-3 model are changeset operations. `freeze_slugs` writes `slug::` lines into kNNowledge content. `bump_version` carries its level (`patch`, `minor` or `major`, default `patch`) in `to`. An explicit `version` is refused with `INVALID_BUMP_LEVEL`, the unversioned lineage record is refused with `RECORD_UNVERSIONED`, and a non-Level-3 target of either op is refused with `LEVEL3_ONLY`.

The apply engine MUST bump a touched model exactly once. A `bump_version` change replaces the default patch bump for its model; when several are present, the highest requested level wins. It MUST NOT add a bump on top. A higher level resets the lower ones (`V_0-1-3` minor gives `V_0-2-0`). The legacy rename of the model file to a `_V_x-y-z_` name and the cascade of renamed references are removed: live filenames are invariant.
(Previously: the direct schema operations were `add_concept`, `add_field` and `set_marker`.)

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

### Requirement: Field updates preserve the value type

`update_field` (applied from a changeset `to::` or called directly through `apply_change`) MUST preserve the type of the field's existing value. When the existing value is a number and the new value is a string that parses as a finite number, the stored value MUST be that number; when the existing value is a boolean and the new value is `true` or `false` (case-insensitive), it MUST be that boolean; when the existing value is an array and the new value is a bracketed list, it MUST be the array that `parsePropertyValue` reads from it. In every other case the new value MUST be stored as the string received, including when the field has no existing value. The serialized document MUST therefore write `price:: 7`, never `price:: "7"`, after `price` was a number. A string value containing a newline, once serialized, MUST read back as the same string through the document parser. `update_matrix_cell` is unchanged. (S3b P0-3.)

#### Scenario: A number stays a number (regression)
- GIVEN an element with `price:: 5`
- WHEN a changeset with `op:: update_field`, `to:: 7` targets `&price` and is applied and serialized
- THEN the document line reads `price:: 7` (today `price:: "7"`)
- AND re-parsing yields the number `7`

#### Scenario: A boolean stays a boolean
- GIVEN an element with `active:: true`
- WHEN `update_field` sets `to:: false`
- THEN the serialized line reads `active:: false`, unquoted

#### Scenario: A numeric-looking string stays a string
- GIVEN an element with `code:: "007"` (a string)
- WHEN `update_field` sets `to:: 008`
- THEN the stored value is the string `008` and it serializes quoted

#### Scenario: An explicit non-numeric replacement is stored as a string
- GIVEN an element with `price:: 5`
- WHEN `update_field` sets `to:: TBD`
- THEN the stored value is the string `TBD` and no error is raised

#### Scenario: An array stays an array
- GIVEN an element with `sources:: [a.md, b.md]`
- WHEN `update_field` sets `to:: [a.md, c.md]`
- THEN the stored value is the array `["a.md", "c.md"]`

#### Scenario: A new field is a string
- GIVEN an element with no `budget` field
- WHEN `update_field` sets `budget` `to:: 100`
- THEN the stored value is the string `100` (unchanged behaviour)

#### Scenario: Direct apply_change preserves the type
- GIVEN an element with `price:: 5`
- WHEN `apply_change` runs `update_field` with `value: 7` (MCP stringifies it)
- THEN the persisted line reads `price:: 7`

#### Scenario: A multi-line string round-trips
- GIVEN an element with a `summary` string field
- WHEN `update_field` sets it to `line one` + newline + `line two`, the document is serialized and parsed again
- THEN the parsed `summary` equals `line one` + newline + `line two` (today the read-back value holds a literal backslash-n)

### Requirement: Concept-Level Field and Matrix Removal Operations

The `ChangeOp` set MUST gain `update_concept_field {conceptName, fieldName, value}` and `remove_matrix {matrixName}`. Both are Level-3 content operations applied through a changeset, and both MUST be listed in the closed `op` options of the `changes` bluepriNNt, so that a changeset using them validates. `update_concept_field` MUST write the concept-level value of a declared Field, validated by the same `validateFieldValue` as element values, and MUST NOT touch element own values or the concept text. `remove_matrix` MUST delete the named matrix section, including an `item-markers matrix`, and MUST fail naming `matrixName` when that matrix does not exist. Preconditions: `update_concept_field` MUST carry `from`, the current concept-level value in canonical form (empty when none is set), and MUST fail with `PRECONDITION_FAILED` and write nothing when it does not match. `remove_matrix` carries no precondition. Neither operation uses `base_hash`, which is element-scoped. Two changes in one changeset that target the same concept field, or the same matrix, MUST be reported as a conflict.

#### Scenario: Concept-level value updated
- GIVEN a model whose concept `Goals` has `tags:: [core]`
- WHEN a changeset applies `update_concept_field` with `fieldName: tags`, `from: [core]` and `value: [core, ai]`
- THEN the concept section holds `tags:: [core, ai]` and no element gains or loses an own value

#### Scenario: Stale concept-level precondition
- GIVEN concept `Goals` with `tags:: [core, ai]`
- WHEN `update_concept_field` arrives with `from: [core]`
- THEN it fails with `PRECONDITION_FAILED` and nothing is written

#### Scenario: Invalid concept-level value is rejected
- GIVEN a closed Field `scope` with options `[core, edge]`
- WHEN `update_concept_field` sets it to `[other]`
- THEN the change is rejected naming `other` and nothing is written

#### Scenario: Matrix removed
- GIVEN a model with an `item-markers matrix`
- WHEN a changeset applies `remove_matrix` with that matrix name
- THEN the matrix section is absent from the serialized model

#### Scenario: Unknown matrix is rejected
- GIVEN a model without matrix `ghost`
- WHEN `remove_matrix {matrixName: ghost}` is applied
- THEN it fails naming `ghost` and nothing is written

#### Scenario: Changeset with the new ops validates
- GIVEN a changeset document holding one `update_concept_field` and one `remove_matrix` change
- WHEN it is validated against the `changes` bluepriNNt
- THEN no invalid-`op` diagnostic is reported

### Requirement: Multi-Valued Field Updates and Pre-Change Hash Preconditions

`update_field` changes on a multi-valued Field MUST accept an array and validate each member under the Field vocabulary rules of `field-value-model`. They MUST write own values only, never inherited ones. A change carrying a `base_hash` computed before the markers-free hash contract MUST fail the existing `base_hash` precondition as a stale hash, and MUST never apply silently.

#### Scenario: Array update validated per member
- GIVEN a closed multi-valued Field `scope` with options `[core, edge]`
- WHEN a change sets `scope` to `[core, other]`
- THEN the change is rejected naming `other`

#### Scenario: Own values only
- GIVEN an element inheriting `tags:: [core]` from its concept
- WHEN a change sets `tags` to `[ai]`
- THEN the element's own `tags` is `[ai]` and the concept-level value is unchanged

#### Scenario: Pre-change base_hash is stale
- GIVEN a proposed change whose `base_hash` was computed with the old hash contract
- WHEN it is applied
- THEN it is reported as a precondition failure and the field is not written

#### Scenario: Tag correction applies as update_field
- GIVEN a review correction on field `tags` carrying the full new array
- WHEN it is applied
- THEN it is applied as `update_field` on the element's own `tags`

