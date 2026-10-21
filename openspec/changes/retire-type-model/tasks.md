# Tasks: Retire `type:: model` in Favour of `type:: knowledge`

## 1. Behaviour seam (`nn-core`) — tests first

- [ ] 1.1 Add failing unit tests in `iNNfo/packages/nn-core/tests/` asserting that a template declaring `type:: model` yields `ConceptField.type === 'knowledge'` after schema extraction
- [ ] 1.2 Add failing traversal tests asserting that a `type:: model` field with a non-canonical name is enqueued by `recursiveParse` exactly as a `type:: knowledge` field
- [ ] 1.3 Implement `normalizeFieldType` / `normalizeConceptType` in `nn-core/src/types/parser.ts`, mapping `'model' → 'knowledge'`; comment both entries in `FIELD_TYPES` / `CONCEPT_TYPES` as deprecated
- [ ] 1.4 Apply the alias at schema extraction (`nn-core/src/schema/extract.ts`) before `ConceptField.type` is assigned
- [ ] 1.5 Apply the alias in the traversal reference-name builder (`nn-core/src/recursiveParser/workspace.ts`) so the `knowledge` branch also covers `model`
- [ ] 1.6 Run the affected suites: `npm --workspace=@cognnitive/nn-core test -- schema recursiveParser`

## 2. Deprecation diagnostic — tests first

- [ ] 2.1 Add a failing test asserting one `FIELD_TYPE_MODEL_DEPRECATED` warning per `type:: model` occurrence on a field and on a concept, with `valid` unchanged
- [ ] 2.2 Add a failing test asserting `body-type-model-retired` is no longer emitted
- [ ] 2.3 Replace the `body-type-model-retired` block in `nn-core/src/validator/content.ts` with the `FIELD_TYPE_MODEL_DEPRECATED` warning (field + concept declarations, inline fix hint)
- [ ] 2.4 Replace the existing `body-type-model-retired` test with the new diagnostic test
- [ ] 2.5 Run the validation suites: `npm --workspace=@cognnitive/nn-core test -- validator`
- [ ] 2.6 Verify MCP parity: `validate_knowledge` / `validate_blueprint` surface the same code, message and hint

## 3. Level-1 spec (`iNNfo_V_0-5-0_NN.md`) + registry mirror

- [ ] 3.1 Edit the Concept/Field `type` tables to mark `model` deprecated and keep `knowledge` canonical
- [ ] 3.2 Rewrite the Knowledge Fields paragraph to describe `type:: knowledge` as the single submodel-reference type and note `type:: model` as a deprecated alias
- [ ] 3.3 Fix the `type:: citation` description example to `sources/import/<file>@## Heading`
- [ ] 3.4 Regenerate the embedded mirror `nn-core/src/schema/canonical-registry.ts` from the edited spec
- [ ] 3.5 Confirm `canonical-registry.test.ts` (byte-for-byte mirror) is green

## 4. Shipped bluepriNNts + catalog

- [ ] 4.1 Retype `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md`: `bluepriNNts` concept and its `path` field from `type:: model` to `type:: knowledge`; bump `blueprint_version`
- [ ] 4.2 Retype the live workspace bluepriNNt `Models` concept (`path`, `blueprint`, `status` fields) to `knowledge`; bump its version key
- [ ] 4.3 Edit `iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md`: remove the `### Markers` prose section and change the Level-3 template example `model_version` → `knowledge_version`; bump `template_version`
- [ ] 4.4 Run `npm run sync:versions` and `npm run sync:versions --check`
- [ ] 4.5 Regenerate `catalog.json` via `node scripts/blueprint-catalog.mjs` and confirm the blueprint inventory guard passes
- [ ] 4.6 Confirm the frozen files (`cogNNitive_V_0-2-1_NN.md`, `workspace_V_0-2-2_NN.md`) are byte-identical

## 5. Vocabulary

- [ ] 5.1 Add the `type:: knowledge` canonical entry and the `type:: model` retired-identifier entry to `iNNfo/specs/vocabulary.json`
- [ ] 5.2 Regenerate `docs/innfo/documentation/vocabulary.md`
- [ ] 5.3 Run the vocabulary consistency check (`npm run check:integrity` or the dedicated gate)

## 6. Doc-drift repairs

- [ ] 6.1 Confirm no live spec or workspace file shows `sources/nn/` or `#slug` in a citation example for `type:: citation`
- [ ] 6.2 Confirm no live file shows `model_version` outside frozen predecessors
- [ ] 6.3 Update `docs/innfo/documentation/` pages that name `type:: model` as a live type
- [ ] 6.4 Confirm no live spec still describes `target_template` as the conformance property (the live key is `target_blueprint`)

## 7. OpenSpec bookkeeping

- [ ] 7.1 Add a follow-up backlog item for the hard removal of `model` from `FIELD_TYPES` / `CONCEPT_TYPES`
- [ ] 7.2 Confirm `openspec validate retire-type-model --strict` passes

## 8. Verification gate

- [ ] 8.1 Run `npm run lint`, `npm run typecheck`, `npm run format:check` on changed files
- [ ] 8.2 Run `npm run verify:fast`, then `node scripts/verify.js`
- [ ] 8.3 Run the success-criteria scans (`rg "type:: model"`, `rg "sources/nn/|#slug"`, `rg "model_version"`)
- [ ] 8.4 Commit in reviewable work units and push the session branch
- [ ] 8.5 Land on `dev` (PR or server-side fast-forward) and confirm CI is green
