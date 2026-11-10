# change-provenance Delta Spec

Execution facts that are the same for every change of a batch are written once, in the changeset frontmatter, and every change inherits them. On the measured domaiNN these repeated lines (`resolved_target` equal to `target`, `evidence_sha256`, `batch`, `applied_at`, `status`, `resolution`) were about 3.5 MB of a 6.7 MB change log.

## ADDED Requirements

### Requirement: The fold expands `set_fields` into one unit per field

The fold MUST turn one applied `set_fields` change into one unit per key of its `to` object, keyed `model@slug&field`, each with the same history hop, the same evidence and the same position in the canonical order.
Value history, field origin, drift, the console payload and the console review MUST read these units through the change log and MUST NOT special-case `set_fields` themselves.
`resolved_target` of a `set_fields` change is the element address `model@frozen-slug`; the fold appends `&field` per key.

#### Scenario: Each field gets its own origin
- GIVEN an applied `set_fields` on `m@alerta` with `to:: {"topics":"ai","language":"es"}` and `evidence:: [A]`
- WHEN the log is folded
- THEN the units `m@alerta&topics` and `m@alerta&language` exist with values `ai` and `es`
- AND the origin of each is that change with evidence `[A]`

#### Scenario: A later update_field supersedes one field only
- GIVEN that `set_fields` followed by an applied `update_field` on `m@alerta&language` with `to:: en` and `evidence:: [B]`
- WHEN the log is folded
- THEN the origin of `m@alerta&language` is the `update_field` with value `en`
- AND the origin of `m@alerta&topics` is still the `set_fields`

#### Scenario: Drift sees no unrecorded edit
- GIVEN a model written only by applied `set_fields` changes
- WHEN `checkProvenance` runs
- THEN it reports no `EDITED_WITHOUT_RECORD` and no `UNIT_WITHOUT_RECORD`

## MODIFIED Requirements

### Requirement: Per-change execution facts

Each change MUST have an `applied_at` (UTC `YYYY-MM-DDTHH:mm:ss.SSSZ`), `status`, `author` and `batch`, and each applied change MUST have a `resolved_target` and, when its evidence cites a file, an `evidence_sha256`; the change log MUST resolve each of them as the change's own value when the change carries it, and otherwise as the value its changeset carries.
The apply engine MUST write the batch-wide facts once, in the changeset frontmatter: `applied_at`, `batch`, `status`, and `evidence_sha256` as a map from each cited workspace-relative path to its lowercase hex sha256.
The apply engine MUST NOT write on a change a fact whose value equals the inherited one: `applied_at` and `batch` are never written on a change, `status` only when it differs from the changeset status, `author` only when it differs from the frontmatter `author`, `resolution` only when the change did not apply successfully, `resolved_target` only when it differs from `target`, and `evidence_sha256` only for a cited path the frontmatter map does not carry.
Resolution happens in one function of the change log (`changelog/load.ts`); no consumer reads the frontmatter or a change field for these facts directly.
A changeset written before this change, whose changes carry every fact themselves, MUST resolve to the same facts, because a change's own value always wins.
(Previously: every change carried its own `applied_at`, `status`, `author`, `batch`, `resolution`, `resolved_target` and `evidence_sha256`, and the frontmatter was forbidden from being their only home.)

#### Scenario: Facts are written once and inherited
- GIVEN a changeset of three changes applied at `2026-10-23T10:00:00.123Z` by author `juan`, all applied successfully, each citing `sources/r.csv`
- WHEN the changes are persisted
- THEN the frontmatter carries `applied_at`, `batch` equal to the changeset stem, `status: applied` and `evidence_sha256` with one entry for `sources/r.csv`
- AND no change carries `applied_at`, `batch`, `status`, `resolution`, `resolved_target` or `evidence_sha256`
- AND the change log resolves each change to that `applied_at`, `batch`, `status: applied`, `author: juan` and the sha of `sources/r.csv`

#### Scenario: A differing fact stays on the change
- GIVEN a changeset applied as `partially_applied` where one change conflicted and one change resolved to a frozen slug that differs from its `target`
- WHEN the changes are persisted
- THEN the conflicted change carries `status:: conflict` and its `resolution`
- AND the resolved change carries its `resolved_target`

#### Scenario: A pre-existing changeset resolves unchanged
- GIVEN a changeset whose changes each carry `applied_at`, `status`, `author`, `batch`, `resolved_target` and `evidence_sha256`
- WHEN the change log loads it
- THEN every change resolves to the values it carries

#### Scenario: The canonical order is unchanged
- GIVEN two changesets, one written with inherited facts and one with per-change facts
- WHEN `compareChanges` orders their changes
- THEN the order is the same as if every fact were written on each change
