# changes-compact-format

Objective: shrink the change log (set_fields, inherited execution facts), fix the staleness window, state the seal honestly.
Branch: session/changes-compact-format. Delivery: one PR to main. Runner: vitest (`npx vitest run <file>` in iNNfo/packages/<pkg>).
Delta spec: openspec/changes/changes-compact-format/specs/ (changeset-document-model, change-provenance, changeset-apply-engine).

## Specs

- S1 (changeset-apply-engine) Staleness reads the whole applied log once per apply, ordered by `compareChanges`; no count bound, no filename order; each changeset file parsed at most once per apply.
- S2 (changeset-document-model) `set_fields` op: `target` `model@element`, `to` JSON object, optional `from` JSON subset, one evidence, all or nothing; `INVALID_OPERATION` for empty/non-object `to`, repeated key, `from` key not in `to`; `USE_UPDATE_ELEMENT_TEXT` for `description`; sealed via `to`/`from`.
- S3 (changeset-document-model) Emitters: `add_element` then one `set_fields` per shared evidence; inline-fields rejection message points to `set_fields` and `update_field`.
- S4 (change-provenance) Fold expands `set_fields` into one unit per field with the same hop/evidence/order; `resolved_target` is `model@frozen-slug`.
- S5 (change-provenance) Batch-wide facts (`applied_at`, `batch`, `status`, `evidence_sha256` map) written once in frontmatter; changes carry only differing facts; the log resolves own value else changeset value; old per-change changesets resolve unchanged.
- S6 (changeset-document-model) Seal described as an integrity check, not tamper-proof, in the bluepriNNt and docs.

## Tasks

- T1 S1 inline — staleness history loaded once per apply. done (6b0ecdb4)
- T2 S2 S4 delegated (bounded writer) — set_fields op (types, parser/validation, apply, fold). done (see Log L2)
- T3 S3 inline — emitters (importers/convergence planner) use set_fields. pending
- T4 S5 inline — inherited execution facts (apply writer + log loader). pending
- T5 S6 S2 inline — `changes` bluepriNNt text, op list, seal wording. pending
- T6 S3 S4 S5 delegated — domain console runtime (change cards, revert, pseudo-units, console export emitter, resolved facts in the payload, regenerated bundle). pending

Route: inline for all; units share apply-change.ts and the serializer, so no disjoint parallel writers (Writer trigger not met).

## Log

- L1 (2026-11-10) "Yes, implement" — implement the changes-compact-format delta spec (the user approved every recommendation except a hash chain).
- L2 (2026-11-10) T2: `set_fields` added to CHANGE_OPS with `setFieldsProblems`/`setFieldsEntries` (nn-core changeset/types.ts); apply expands it into `<id>&<field>` update_field sub-items and folds them back before every write-back (one block, seal valid); the log (changelog/load.ts) expands an applied set_fields into one update_field entry per field with `subIndex` in `compareChanges`. The `changes` bluepriNNt op options gained `set_fields` (needed by propose validation) and canonical-registry.ts was regenerated. Evidence: nn-core tests/changelog/set-fields.test.ts 11/11 GREEN (5 RED first); nn-mcp src/tools/set-fields.spec.ts 15/15 GREEN (10 RED first).
- L3 (2026-11-10) Parent addendum: add T6 (domain console runtime) after T5, as its own commit.
