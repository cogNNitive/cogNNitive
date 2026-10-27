# Tasks: Console Procedure View — Structure From The Model

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~780 (S1 ~180, S2 ~120, S3 ~140, S4 ~120, S5 ~90, S6 ~90, S7 ~40) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | S1 → PR 1, S2+S3 → PR 2, S4 → PR 3, S5+S6 → PR 4, S7 → PR 5 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

Hard prerequisite: none. Issue **#360** is absorbed by S1.

Paths: `RT` = `iNNfo/specs/bluepriNNts/console/nn-runtime.js`; `STEP` =
`iNNfo/specs/bluepriNNts/console/render-procedure-stepper.js`; `BUNDLE` =
`iNNfo/specs/bluepriNNts/console/nn-console.bundle.js`; `BP` =
`iNNfo/specs/bluepriNNts/procedures/spec_NN.md`; `PAYLOAD` =
`iNNfo/packages/nn-core/src/console/`. Console suites run with `node --test <file>`; gate
with `node scripts/verify.js --only=<substring>`; after any console source change:
`node scripts/build-console-bundle.mjs` then
`node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`.

### Suggested Work Units

| Unit | Goal | Likely PR | Depends on |
|------|------|-----------|------------|
| S1 | Deterministic chain order (absorbs #360) | PR 1 | - |
| S2 | One owner of tree semantics | PR 2 | S1 |
| S3 | Structural diagnostics strip | PR 2 | S1 |
| S4 | Payload emits the catalog link | PR 3 | - |
| S5 | Tab shows the catalog ficha | PR 4 | S4 |
| S6 | Decision steps render as branches | PR 4 | S2 |
| S7 | Blueprint template shows the combined shape | PR 5 | - |

Each slice is revertible alone.

## Slice 1: Deterministic chain order (spec: innfo-console-runtime "Procedure Step Chain Is Derived From Declared References"; design D1, D4, D10; absorbs #360)

- [ ] 1.1 RED `test/console-procedure-view.test.mjs`: a fixture whose chain head (`Configurar`) is **not** alphabetically first; assert the rendered chain starts at the head and reaches the tail with no step dropped. Add the `#360` repro (canonical `ingest_visual_catalog` order) as a second case.
- [ ] 1.2 GREEN `RT`: `chainOf` derives the head (child no sibling targets via `next::` within the same parent), then follows `next::` (relation, then `next::` field label); remove the dependence on `children[0]`.
- [ ] 1.3 GREEN `RT`: the sibling tie-break is document order, not `localeCompare`; delete the alphabetical fallback.
- [ ] 1.4 `STEP`: consume the runtime chain only; delete the local `firstChild`/`nextStep` fallback paths used for ordering.
- [ ] 1.5 Rebuild `BUNDLE`; regenerate the testlab fixture; `node scripts/verify.js --only=console`.
- [ ] 1.6 Mutation check: reverting 1.2 turns 1.1 red (no vacuous pass).

## Slice 2: One owner of tree semantics (spec: innfo-console-runtime "One Owner Of Console Tree Semantics", "Procedure Stepper Runtime" MODIFIED; design D3)

- [ ] 2.1 RED: grep-style test — `STEP` contains no `sortChildren`/`chainOf`/`firstChild`/`nextStep`/`resolveParentId`/`cleanRef` definitions and no ordering logic.
- [ ] 2.2 GREEN `STEP`: remove the duplicated tree helpers and their `RT.*`-or-fallback branches; call `RT` directly; keep the "runtime not available" state for the no-runtime case.
- [ ] 2.3 Rebuild `BUNDLE`; regenerate the testlab fixture; `node scripts/verify.js --only=console`.

## Slice 3: Structural diagnostics (spec: innfo-console-runtime "Procedure Structure Defects Are Visible"; design D2, D8)

- [ ] 3.1 RED: `RT` reports a `StructuralDefect` for a cycle, a fork (two heads), a `next::` outside the parent, and an unreachable step; the view renders a structure summary (`N procedures · M steps · K ungrouped`) and one line per defect naming the element.
- [ ] 3.2 GREEN `RT`: collect defects while building the tree/chain; expose a summary with the tree.
- [ ] 3.3 GREEN `STEP`: render the structure strip from the summary; a document with no root `Work` shows the ungrouped count instead of a silent wall of tabs.
- [ ] 3.4 Rebuild `BUNDLE`; regenerate the testlab fixture; `node scripts/verify.js --only=console`.
- [ ] 3.5 Mutation check: removing the defect collection turns 3.1 red.

## Slice 4: Payload emits the catalog link (spec: console-payload-builder "Procedure Catalog Link Is Emitted"; design D5)

- [ ] 4.1 RED `PAYLOAD` test: a `Procedure` with `procedure_model::` emits a `procedure_model` relation targeting the root `Work`'s id; an unresolved target emits no relation and does not fail the build.
- [ ] 4.2 GREEN `PAYLOAD`: resolve `procedure_model::` per document and emit the relation on the `Procedure` element.
- [ ] 4.3 `BP`: `Procedure` Field Definition `procedure_model` becomes `type:: reference`, `target_concepts:: [Work]`; run `validate_knowledge` on a document using it.
- [ ] 4.4 Rebuild the `console-payload.generated.cjs` mirror; `node scripts/verify.js --only=payload`.
- [ ] 4.5 Golden-payload check: existing consumers see only an added relation (no field removed).

## Slice 5: Tab shows the catalog ficha (spec: innfo-console-runtime "Procedure Tab Shows The Catalog Entry"; design D6)

- [ ] 5.1 RED: a `Procedure` joined to a root `Work` renders its `summary`, `category`, `executed_by`, `inputs_required`, `outputs_expected` in the header; a root `Work` with no `Procedure` renders a "no catalog entry" note with no fabricated values.
- [ ] 5.2 GREEN `STEP`: join via the `procedure_model` relation; render the ficha; omit missing fields.
- [ ] 5.3 Rebuild `BUNDLE`; regenerate the testlab fixture; `node scripts/verify.js --only=console`.

## Slice 6: Decision steps render as branches (spec: innfo-console-runtime "Decision Steps Render As Branches"; design D7)

- [ ] 6.1 RED: a `decision` step with two `next::` targets renders both outcomes; a `decision` with one target renders as a normal step; the `next::` references are unchanged.
- [ ] 6.2 GREEN `STEP`: branch rendering for multi-target decisions.
- [ ] 6.3 Rebuild `BUNDLE`; regenerate the testlab fixture; `node scripts/verify.js --only=console`.

## Slice 7: Blueprint template shows the combined shape (spec: design D9; `BP`)

- [ ] 7.1 `BP`: the template section shows the combined document — catalog `Procedure` + root `Work` (`next::` to the first step) + `parent::`-linked steps — matching a shipped example.
- [ ] 7.2 Document the "structure fix" assistant: it reports a missing root `Work`/`parent::` and suggests the patch; it never edits the domain (mirror video-series `D16`).
- [ ] 7.3 `node scripts/verify.js --only=procedures`; blueprint immutability guard passes with the version bump if `BP` changes.

## Final

- [ ] Full `node scripts/build-console-bundle.mjs` + drift check green.
- [ ] Regenerate `test/fixtures/testlab/domaiNN_console.html` and commit it in the session branch.
- [ ] `node scripts/verify.js` green; CI green on `dev`.
