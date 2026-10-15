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

### Requirement: Direct `apply_change` operations are a closed, classified set
The `apply_change` tool MUST accept an operation only if it is a changeset `ChangeOp`, a maintenance operation (`bump_version`, `generate_index`, `freeze_slugs`) or a schema operation (`add_concept`, `add_field`, `set_marker`); any other operation MUST fail with `UNKNOWN_OPERATION` and write nothing. Every change to Level-3 content MUST go through a changeset; maintenance and schema operations MAY write the model file directly because they alter no Level-3 content.

#### Scenario: Maintenance operation writes directly
- GIVEN a frozen model `acme`
- WHEN `apply_change` runs `bump_version` on `acme`
- THEN the model file is rewritten and no changeset is written under `changes/`

#### Scenario: Content operation is synthesized as a changeset
- GIVEN a model `acme` with an element `risk-1`
- WHEN `apply_change` runs a content operation (for example `set_field`) with `id` and `args`
- THEN one applied changeset is written under `changes/`

#### Scenario: Unclassified operation is rejected
- GIVEN an operation name that is neither a `ChangeOp` nor in the maintenance or schema lists
- WHEN `apply_change` receives it
- THEN it fails with `UNKNOWN_OPERATION` and no file is changed

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

