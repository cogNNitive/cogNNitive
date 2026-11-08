# changeset-apply-engine Delta Spec

Slice 3, PR 3a. The schema, provenance markers and error codes of the operation are owned by `changeset-review-gate`.

## ADDED Requirements

### Requirement: Verdict changes are applied only from a human changeset, never synthesized

`review_gate` is a `ChangeOp`, so it belongs to the classified set of "Direct `apply_change` operations are a closed, classified set". The apply engine MUST apply it only as a change inside a changeset document that satisfies "Applying a verdict requires a human console changeset" (`changeset-review-gate`). The bare-intent path of `apply_change` (a call with `id`, `op` and `args` that synthesizes a one-change changeset) MUST refuse `op: review_gate` with `GATE_VERDICT_REFUSED`, regardless of any provenance claimed in `args`, and MUST write no changeset. Applying an existing human console changeset file by path is not a bare intent and is allowed (this is the download fallback of the console).

#### Scenario: Bare intent refused

- GIVEN `apply_change` called with `op: review_gate` and args claiming `author_kind: human`
- WHEN the call runs
- THEN it fails with `GATE_VERDICT_REFUSED`
- AND no file is written under `changes/`

#### Scenario: Human changeset file applies

- GIVEN a sealed proposed changeset file written by the console with `author_kind: human`, `origin: console`, a reviewer and `review_gate` changes
- WHEN `apply_change` is run on that file
- THEN the verdicts are applied

#### Scenario: Classification stays exhaustive

- GIVEN the set of operations the engine implements
- WHEN the classification test compares it with `ChangeOp`, the maintenance list and the schema list
- THEN `review_gate` is in `ChangeOp` only and every operation still belongs to exactly one list

### Requirement: Verdict failures leave the model untouched

Each verdict failure code of `changeset-review-gate` ("Verdict error codes are one closed set") returned by the apply engine MUST leave the model and the `changes/` history untouched apart from the persisted rejected changeset.

#### Scenario: Rejection persists only the rejected changeset

- GIVEN a changeset refused with `GATE_NOT_HUMAN`
- WHEN the domaiNN is compared with its state before the apply
- THEN the only difference is the changeset file marked rejected
