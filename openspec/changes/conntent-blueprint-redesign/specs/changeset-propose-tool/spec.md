# changeset-propose-tool Delta Spec

Slice 3, PR 3a (nn-mcp `propose-changeset.ts`). The error code is owned by `changeset-review-gate`.

## ADDED Requirements

### Requirement: Agent-side propose refuses verdict operations

`propose_changeset` MUST refuse any operation whose `op` is `review_gate`, whatever author, provenance markers (`author_kind`, `origin`, `reviewer`) or other keys the call claims, with `GATE_VERDICT_REFUSED` naming the operation index, and MUST write nothing. The refusal MUST be evaluated before any other validation so that a mixed proposal is refused whole. A verdict reaches `changes/` only through a human changeset written by a console, never through this tool.

#### Scenario: Pure verdict proposal refused

- GIVEN a `propose_changeset` call with one `review_gate` operation
- WHEN it runs
- THEN it returns `GATE_VERDICT_REFUSED`
- AND no file is written under `changes/`

#### Scenario: Mixed proposal refused whole

- GIVEN a call with an `update_field` and a `review_gate` operation
- WHEN it runs
- THEN it returns `GATE_VERDICT_REFUSED`
- AND the `update_field` is not written either

#### Scenario: Claimed human origin does not help

- GIVEN a `review_gate` operation in a call claiming `author_kind: human`, `origin: console` and a reviewer name
- WHEN `propose_changeset` runs
- THEN it still returns `GATE_VERDICT_REFUSED`

#### Scenario: Other operations unaffected

- GIVEN a call with only an `update_field` operation
- WHEN it runs
- THEN the proposal is written as before

### Requirement: Single writer does not mint verdicts

`writeProposedChangeset` MUST NOT be used by any agent-facing code path to write a `review_gate` change. Engine-internal callers (the coNNtent engine) MUST NOT write `review_gate` changes either; the only writer of a verdict is a console acting for a human.

#### Scenario: Engine writes no verdicts

- GIVEN a complete `produce` run that passes every gate
- WHEN the changesets the engine wrote are scanned
- THEN none contains a `review_gate` change
