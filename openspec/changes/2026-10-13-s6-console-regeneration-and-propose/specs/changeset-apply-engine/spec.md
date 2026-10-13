# Delta for changeset-apply-engine

## ADDED Requirements

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
