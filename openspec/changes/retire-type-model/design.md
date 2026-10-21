# Design: Retire `type:: model` in Favour of `type:: knowledge`

## Context

`nn-core` accepts both `knowledge` and `model` as field and concept types
(`src/types/parser.ts`). Only `knowledge` is wired into behaviour:

| Consumer | File | Uses |
|---|---|---|
| Traversal reference extraction | `src/recursiveParser/workspace.ts` | `f.type === 'knowledge'` |
| Submodel reference validation | `src/validator/references.ts` | `fieldDef.type === 'knowledge'` |
| Cross-model reference validation | `src/validator/workspaceReferences.ts` | `type === 'reference' \|\| type === 'knowledge'` |
| Mutation reference rewrite | `src/mutate.ts` | `type === 'reference' \|\| type === 'knowledge'` |

`type:: model` therefore has no behaviour of its own. It survives only because the traversal
also hardcodes a set of reference *names* (`path`, `file_ref`, `source_model`,
`procedure_model`, `artifact_model`, `models`, `sources`, `procedures`, `artifacts`), which is
why the `domaiNN` bluepriNNt's `type:: model` `path` field still works while an arbitrarily
named `type:: model` field does not.

A validator rule `body-type-model-retired` exists in `src/validator/content.ts`, but it is
guarded by `if (isV030 || fm.level === 2)` inside the body block and does not fire for a
V_0-5-0 Level-2 document (verified: a probe blueprint declaring `type:: model` validates
clean). Enforcement is partial and misleading.

Constraints from the working tree:

- `iNNfo_V_0-5-0_NN.md` is the live Level-1 spec; `iNNfo_V_0-3-0_NN.md` and
  `iNNfo_V_0-4-0_NN.md` are frozen predecessors allowlisted in `check-spec-version.mjs`.
  Editing V_0-5-0 in place is the sanctioned path, but `canonical-registry.test.ts` asserts
  the embedded mirror is byte-for-byte equal to disk, so the mirror MUST be regenerated.
- `cogNNitive_V_0-2-1_NN.md` and `workspace_V_0-2-2_NN.md` are byte-frozen
  (`bluepriNNt-field-catalogue.test.ts`); their live `spec_NN.md` counterparts are editable
  with a version bump.
- `lineage-bluepriNNts-docs` pins the `ModelRecords` / `model_ref` vocabulary: renaming it is
  forbidden.
- `base-composite-template` defines "frozen" as *no upgrade notices*, not *never edited*.

## Goals / Non-Goals

**Goals:**

- One submodel-reference vocabulary: `type:: knowledge`.
- Keep existing documents valid: `type:: model` normalizes to `knowledge` at intake.
- Make the silent-failure trap loud: a deprecation diagnostic on every `model` occurrence.
- Repoint every shipped spec, bluepriNNt and OpenSpec capability to `knowledge`.
- Repair the three verified doc drifts.

**Non-Goals:**

- Hard-removing `model` from `FIELD_TYPES`/`CONCEPT_TYPES` (deferred to a follow-up change
  once no live document uses it).
- Renaming `ModelRecords` / `model_ref` / `model_template`.
- Migrating any user domaiNN (`nn-upgrade`). Existing domains keep validating as-is; the
  diagnostic tells the user what to fix.
- Bumping the Level-1 spec version (V_0-5-0 is edited in place).
- Cutting any release tag.

## Decisions

### D1. Deprecated alias, not hard removal

`type:: model` stays a valid token and normalizes to `knowledge`. Alternatives:

- **Hard removal** — would invalidate every live document that uses `model` at once and force
  an `nn-upgrade` migration in the same change. Rejected: too much blast radius for a
  vocabulary fix.
- **Status quo** — leaves the silent-failure trap. Rejected: that is the bug.

### D2. Normalize at intake, in one seam

A new `normalizeFieldType` / `normalizeConceptType` pair in `src/types/parser.ts` (or a
co-located alias map) converts `'model' → 'knowledge'`, applied at the two intake points:
schema extraction (`src/schema/extract.ts`, where `ConceptField.type` is assigned) and the
traversal reference-name builder (`src/recursiveParser/workspace.ts`). Every downstream
consumer then sees `knowledge` and needs no edit for behaviour.

Alternative considered: normalize at each of the four consumer sites. Rejected — five
independent call sites drift.

### D3. Deprecation diagnostic: warning with a stable code

`FIELD_TYPE_MODEL_DEPRECATED` at `warning` severity, carrying the field/concept name and an
inline fix hint (`change type:: model to type:: knowledge`). It does not affect `valid`.
Alternative: `error`. Rejected — an error would break every live `model` document, which
contradicts D1.

The dead `body-type-model-retired` rule is replaced by this diagnostic so there is exactly one
message about the token.

### D4. `model` remains in the type lists this change

`FIELD_TYPES` and `CONCEPT_TYPES` keep `'model'` (marked as deprecated in a comment), because
removing it would make valid documents fail the unknown-type check before the alias could
normalize. Removal is a follow-up change gated on a repo-wide scan returning zero.

### D5. Edit the live Level-1 spec in place; regenerate the registry mirror

`iNNfo_V_0-5-0_NN.md` is not a frozen predecessor, so the type table, the Knowledge Fields
prose, and the `type:: citation` example are edited in place and
`src/schema/canonical-registry.ts` is regenerated in the same commit. No `V_0-6-0` file is
introduced.

### D6. BluepriNNt retypes carry a version bump

The `domaiNN` (`blueprint_version`) and `cogNNitive` (`template_version`) bluepriNNts are
edited in place with their version key bumped, and `catalog.json` /
`SHIPPED_BLUEPRINT_VERSIONS` are regenerated by `npm run sync:versions`. A pinned
`parent_spec.url` keeps resolving; the version notice is the signal.

### D7. The lineage record vocabulary is untouched

`ModelRecords`, `model_ref`, `model_template` are the provenance record's own vocabulary,
pinned by `lineage-bluepriNNts-docs` §Scope boundaries. They describe a *record of a produced
model*, not a field type, and are not part of this retirement.

### D8. Doc-drift fixes are conformance repairs

The Level-1 `type:: citation` example, the `cogNNitive` blueprint's `### Markers` prose, and
its `model_version` template key are edited as text. They change no behaviour; they are
recorded under `docs-content-hygiene` so the repair is contractually visible.

## Risks / Trade-offs

- **A previously-inert field becomes a live edge.** → The deprecation warning names each
  affected field; the release note states the intent. Downgrade path is reverting the seam.
- **Diagnostic noise on legacy corpora.** → Warning-only, and the message carries the fix.
- **Mirror drift on the Level-1 spec.** → Regenerated in the same commit; CI test enforces it.
- **A reviewer reads the retype as a rename of the provenance vocabulary.** → D7 and the
  proposal's out-of-scope note.

## Migration Plan

1. Land the seam + diagnostic (Unit A) with tests-first.
2. Land the spec/bluepriNNt retypes and regenerate the mirror and catalog (Unit B).
3. Land vocabulary, docs and OpenSpec bookkeeping (Unit C).
4. No data migration. Existing domains keep validating; the diagnostic lists the fields to
   retype when the user chooses to.

Rollback: revert the merge commit; regenerate `canonical-registry.ts` and `catalog.json` from
the reverted sources. Nothing is published.

## Open Questions

- Should the follow-up hard-removal of `model` from the type lists be filed as a backlog item
  now? (Recommended: yes, cheap and keeps the endgame visible.)
- Should the deprecation diagnostic also fire for `type:: model` on a *concept* declaration,
  or only on fields? (Recommended: both — the `domaiNN` `bluepriNNts` concept is the live
  example.)
