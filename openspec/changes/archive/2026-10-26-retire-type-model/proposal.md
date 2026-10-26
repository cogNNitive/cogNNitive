# Proposal: Retire `type:: model` in Favour of `type:: knowledge`

## Why

`type:: knowledge` is the functional submodel-reference field and concept type in `nn-core`.
`type:: model` is still accepted by the type lists but is **semantically inert**: a field
declared `type:: model` is not followed during domaiNN traversal
(`src/recursiveParser/workspace.ts` adds only `knowledge`-typed fields to the reference-name
set), is not resolved for `target_blueprint` conformance (`src/validator/references.ts`), and
is not checked as a cross-model reference (`src/validator/workspaceReferences.ts`). It only
produces an edge by accident — when the field *name* happens to be one of the hardcoded
defaults (`path`, `file_ref`, `source_model`, `models`, `sources`, `procedures`, `artifacts`)
or when the value is a WikiLink or markdown link. The result is a **silent-failure trap**: a
`type:: model` field with any other name dangles and nothing warns.

Three further drifts compound the confusion, all verified against the working tree at
`dev`:

1. The live Level-2 `domaiNN` bluepriNNt declares `type:: model` for its `bluepriNNts`
   concept and its `path` field, while `kNNowledge.path` in the same document is typed
   `knowledge` — two vocabularies for one mechanism.
2. The Level-1 spec `iNNfo_V_0-5-0_NN.md` lists both `model` and `knowledge` as valid types
   and describes "Knowledge Fields (`type:: knowledge` or `type:: model`)" as if they were
   interchangeable.
3. The `type:: citation` description in the same spec still shows the retired
   `sources/nn/<file>#slug` grammar, and the live `cogNNitive` bluepriNNt still carries a
   prose `### Markers` section for a primitive removed in iNNfo V_0-5-0 plus a retired
   `model_version` key in its Level-3 template example.
4. The `submodel-conformance-validation` specs name `target_template`, a property the live
   resolver replaced with `target_blueprint`.

## What Changes

- **`type:: model` becomes a deprecated alias of `type:: knowledge`.** A single normalization
  seam converts the token at parse intake, so every downstream consumer (traversal,
  extraction, reference validation, mutation, console payload) sees `knowledge`. Existing
  documents keep validating and gain the traversal and conformance behavior they were
  silently missing.
- **A deprecation diagnostic** (`warning`, stable code `FIELD_TYPE_MODEL_DEPRECATED`) surfaces
  every `type:: model` occurrence with an inline fix hint, without failing validation.
  **BREAKING** for any consumer that asserts a `model`-typed field is *not* traversed, and for
  any test that pins `validate` output for a `model`-typed document.
- **Every shipped specification and bluepriNNt is repointed** to `knowledge`: the Level-1
  type tables and prose, the `domaiNN` and `workspace` bluepriNNts, and the OpenSpec
  capability specs that name `type:: model`.
- **`type:: model` is recorded as a retired identifier** in the canonical vocabulary
  dictionary, following the existing `markers-removed-diagnostic` pattern (explicit,
  published, never a silent fallback).
- **Doc-drift repairs**: the Level-1 `type:: citation` example grammar, the `cogNNitive`
  bluepriNNt's retired `### Markers` prose, the retired `model_version` key in its Level-3
  template example, and the retired `target_template` spelling in the
  `submodel-conformance-validation` capability specs (the live key is `target_blueprint`).
- **Not in scope**: renaming the `ModelRecords` / `model_ref` vocabulary of the lineage
  record, which `lineage-bluepriNNts-docs` pins by contract.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `model-primitive-type`: `type:: knowledge` is the single normative submodel-reference
  field/concept type; `type:: model` is a deprecated alias that MUST normalize to `knowledge`
  and MUST emit a deprecation diagnostic. The requirements that declared `model` normative
  are removed with a migration note.
- `recursive-submodel-parsing`: the generalized reference extraction and the schema-aware
  traversal requirement key on `knowledge`-typed fields (the alias normalizes before
  traversal).
- `submodel-conformance-validation`: the resolver contract, file-existence check, and
  `target_blueprint` conformance check apply to `knowledge`-typed fields.
- `workspace-graph-index`: the missing-reference scenario is keyed on a `type:: knowledge`
  field.
- `workspace-entrypoint`: the `Workspace`/`Models`/`Tag` template primitive composition types
  `Models` as `knowledge`.
- `canonical-vocabulary`: `type:: knowledge` is canonical and `type:: model` is recorded as a
  retired identifier; the `Marker Retired, Field and Tag Defined` requirement also fences the
  retired Marker prose out of the live `cogNNitive` bluepriNNt.
- `docs-content-hygiene`: a new requirement pins the Level-1 `type:: citation` description to
  the shipped `sources/import/...@## Heading` grammar and forbids retired `model_version`
  keys in live Level-3 template examples.

## Impact

| Area | Impact | Description |
|---|---|---|
| `iNNfo/packages/nn-core/src/types/parser.ts` | Modified | `FIELD_TYPES` / `CONCEPT_TYPES` mark `model` deprecated; new `normalizeFieldType` / `normalizeConceptType` alias seam |
| `iNNfo/packages/nn-core/src/schema/extract.ts` | Modified | Normalize the extracted `type` before assigning `ConceptField.type` |
| `iNNfo/packages/nn-core/src/recursiveParser/workspace.ts` | Modified | Reference-name set built from normalized `knowledge` types |
| `iNNfo/packages/nn-core/src/validator/{references,workspaceReferences,content}.ts` | Modified | Checks key on `knowledge`; deprecation diagnostic replaces the dead `body-type-model-retired` rule |
| `iNNfo/packages/nn-core/src/mutate.ts` | Modified | Reference-field collection uses the normalized type |
| `iNNfo/packages/nn-core/src/schema/canonical-registry.ts` | Regenerated | Byte-for-byte mirror of the edited Level-1 spec |
| `iNNfo/specs/iNNfo_V_0-5-0_NN.md` | Modified | Type tables, Knowledge Fields prose, `type:: citation` example |
| `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md` | Modified | `bluepriNNts` concept and `path` field retyped; `blueprint_version` bumped |
| `iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md` | Modified | `### Markers` prose removed; template example `model_version` → `knowledge_version`; `template_version` bumped |
| `iNNfo/specs/vocabulary.json` + `docs/innfo/documentation/vocabulary.md` | Modified | `type:: model` retired identifier entry |
| `openspec/specs/**` (7 capabilities) | Modified | Delta specs re-point the vocabulary |
| `manifest/source.yaml`, `catalog.json` | Regenerated | BluepriNNt version bumps via `npm run sync:versions` |

## Approach

One coherent change in three ordered work units, each independently verifiable, all landing
together on `dev` before the batched merge to `main`.

| Unit | Content | Why this position |
|---|---|---|
| A. Behaviour | The alias seam + deprecation diagnostic in `nn-core`, with unit tests first | The contract change everything else documents |
| B. Specs | Level-1 spec edit + registry mirror regeneration; `domaiNN`/`cogNNitive` bluepriNNt retypes and version bumps | Documents the behaviour; needs A's token decision frozen |
| C. Docs & bookkeeping | Vocabulary entries, `docs-content-hygiene` prose fixes, OpenSpec deltas, `sync:versions` | Bookkeeping trails the frozen vocabulary |

## Affected Areas

See the Impact table. No new external dependency, no new package boundary: the change is
confined to `nn-core` internals plus specification and documentation text.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Enabling traversal for previously-inert `model` fields changes an existing workspace graph | Med | The deprecation warning names every affected field; the release note states that `model` fields begin resolving. This is the intended fix, not a regression |
| `model` removed from the accepted type list would invalidate live documents | Low | `model` stays in `FIELD_TYPES`/`CONCEPT_TYPES` as a deprecated alias in this change; hard removal is deferred to a follow-up change |
| The Level-1 spec edit desynchronizes the embedded registry mirror | High | `canonical-registry.test.ts` asserts byte-for-byte equality; regenerate the mirror in the same commit |
| A bluepriNNt retype without a version bump silently repoints pinned `parent_spec` URLs | Med | Bump `blueprint_version` / `template_version` in place and regenerate `catalog.json` + `SHIPPED_BLUEPRINT_VERSIONS` via `npm run sync:versions` |
| A test asserts the retired `body-type-model-retired` diagnostic | Med | Replace that test with the new deprecation-diagnostic test in the same work unit |
| Retired grammar (`sources/nn/`, `#slug`) reintroduced by copy-paste | Low | Full-text scan in the success criteria |

## Rollback Plan

- Unit A: revert the merge commit. The alias seam is additive; no data is migrated.
- Unit B: revert the spec and bluepriNNt edits and regenerate `canonical-registry.ts` and
  `catalog.json` from the reverted sources.
- Unit C: revert. Vocabulary entries and OpenSpec deltas carry no runtime behavior.
- Nothing is published by this change; no tag is cut and no `nn-upgrade` migration is
  executed. A `blueprints-v*` release that ships the retyped bluepriNNts is a separate,
  maintainer-confirmed step.

## Dependencies

- None beyond the repository's own gates (`node scripts/verify.js`).

## Success Criteria

- [ ] `rg "type:: model" iNNfo/specs --glob '!*_V_0-3-0_NN.md' --glob '!*_V_0-4-0_NN.md'` returns 0 outside the frozen predecessors and the deprecation diagnostic text.
- [ ] `rg "sources/nn/|#slug" iNNfo/specs/iNNfo_V_0-5-0_NN.md` returns 0.
- [ ] `rg "model_version" iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md` returns 0.
- [ ] A workspace with a field declared `type:: model` on a non-canonical element name now enqueues the referenced document during `recursiveParse` and reports `FIELD_TYPE_MODEL_DEPRECATED`.
- [ ] `iNNfo/packages/nn-core/src/schema/canonical-registry.ts` mirrors `iNNfo_V_0-5-0_NN.md` byte-for-byte (`canonical-registry.test.ts` green).
- [ ] `node scripts/verify.js` and CI are green on `dev`.

## Assumptions

1. `iNNfo_V_0-5-0_NN.md` is the live Level-1 spec (V_0-3-0 and V_0-4-0 are the frozen
   predecessors in `check-spec-version.mjs`), so it is edited in place with the registry
   mirror regenerated — no new Level-1 version is created.
2. `type:: model` is deprecated, not hard-removed, in this change.
3. The `ModelRecords` / `model_ref` lineage vocabulary is out of scope
   (`lineage-bluepriNNts-docs` pins it).
4. The maintainer is the sole consumer; no backward-compatibility shim is required beyond the
   alias itself.
5. BluepriNNt version bumps are mechanical and gated by `npm run sync:versions`.

## Review Workload Forecast

| Work unit | Est. changed lines (excluding generated) |
|---|---|
| A. Behaviour + tests | ~250 |
| B. Specs + bluepriNNts | ~120 (plus generated mirror/catalog) |
| C. Docs, vocabulary, OpenSpec deltas | ~400 |

- Chained PRs recommended: No (one reviewable unit; all three land on `dev` together).
- 400-line budget risk: Low-Medium. The bulk is documentation text.
- Decision needed before apply: No.

## Ponytail Ceilings & Future Enhancements (Tag: potential-enhancement)

### Ceilings in This Change
- **Soft deprecation seam over hard deletion**: `type:: model` is normalized to `knowledge` at parser intake with a non-fatal warning (`FIELD_TYPE_MODEL_DEPRECATED`) rather than hard removal from valid types.
  - *Upgrade condition*: When all legacy workspaces and external domains have been audited and no occurrences of `type:: model` remain in active use.

### Potential Future Enhancements
- `future: hard-retire-model-keyword`: Remove `model` entirely from `VALID_FIELD_TYPES` and `VALID_CONCEPT_TYPES` arrays in `nn-core/src/types/parser.ts`, making `type:: model` a fatal parse/validation error instead of a deprecation warning.
- `future: automated-type-model-migration`: Add `nn-upgrade` migration codemod to automatically rewrite `type:: model` -> `type:: knowledge` across all workspace `.md` files in a repository.

