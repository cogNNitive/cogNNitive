# change-provenance Specification

## Purpose

The change is the single provenance medium. A knowledge unit carries no provenance; its origin and history are derived from the changes whose `target` points at it.

## ADDED Requirements

### Requirement: Every change carries evidence

Every change MUST carry a non-empty `evidence` value in the shared citation grammar (`<target>@<unit>`, a bare path, or the literal tokens `decision` / `unknown`). The apply engine MUST reject a changeset whose any change lacks `evidence`, naming the offending change id, and MUST write no model. `decision` denotes a human decision with no external artifact; `unknown` denotes an untraceable origin and MUST be discouraged by validation (a warning).

#### Scenario: Change with evidence is accepted
- GIVEN a changeset whose change `c-01` carries `evidence:: sources/import/interview.md@## Clients`
- WHEN the changeset is applied
- THEN the change is persisted with its `evidence` unchanged

#### Scenario: Change without evidence is rejected
- GIVEN a changeset whose change `c-02` has no `evidence`
- WHEN the changeset is applied
- THEN the intake rejects the whole changeset naming `c-02`
- AND no model is written

#### Scenario: `unknown` is accepted but warned
- GIVEN a change carrying `evidence:: unknown`
- WHEN the changeset is applied
- THEN it is accepted
- AND validation emits a warning discouraging `unknown`

### Requirement: Per-change execution facts

Each change MUST carry its own `applied_at` (UTC `YYYY-MM-DDTHH:mm:ss.SSSZ`), `status`, `author` and `batch`, written by the apply engine. The changeset frontmatter MUST NOT be the only home of `applied_at`/`status`/`author`.

#### Scenario: Facts are denormalized onto the change
- GIVEN a changeset applied at `2026-10-23T10:00:00.123Z` by author `juan`
- WHEN the changes are persisted
- THEN each change carries `applied_at` with that value, `author:: juan`, its `status`, and `batch` equal to the changeset stem

### Requirement: Derived origin and history

A field's origin and a target's history MUST be derivable from the change chain alone, by filtering changes whose `target` resolves to that field and ordering by `applied_at`. No companion citation and no model snapshot MUST be consulted.

#### Scenario: Origin derives from the last change
- GIVEN changes `c1` (→8, evidence PDF), `c2` (8→9, evidence conversation), `c4` (9→10, evidence decision) targeting `pricing@sku-42&precio`
- WHEN the origin of `precio` is computed
- THEN it is the last change (`c4`) with its author and evidence
- AND the value history is `[8, 9, 10]` in `applied_at` order

### Requirement: Drift fingerprint for unrecorded edits

The validator MUST emit `EDITED_WITHOUT_RECORD` (severity warning) for any field whose current value is not equal to the `to` of the last applied change targeting it, with a hint to record the change or revert. A field with no targeting change MUST NOT emit the diagnostic.

#### Scenario: Hand edit is flagged
- GIVEN a field whose last targeting change has `to:: 10` and whose current value is `12`
- WHEN validation runs
- THEN `EDITED_WITHOUT_RECORD` is emitted for that field

#### Scenario: Consistent value is silent
- GIVEN a field whose current value equals the last targeting change's `to`
- WHEN validation runs
- THEN no `EDITED_WITHOUT_RECORD` is emitted

### Requirement: No direct model writes

No MCP tool or agent path MAY write a Level-3 model file outside a change. Any such path MUST be rejected.

#### Scenario: Bypass is rejected
- GIVEN an MCP tool invocation that would write a model file without a change
- WHEN it runs
- THEN it is rejected and no file is written
