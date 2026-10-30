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

- [x] 1.1 RED `test/console-procedure-view.test.mjs`: a fixture whose chain head (`Configurar`) is **not** alphabetically first; assert the rendered chain starts at the head and reaches the tail with no step dropped. Add the `#360` repro (canonical `ingest_visual_catalog` order) as a second case.
- [x] 1.2 GREEN `RT`: `chainOf` derives the head (child no sibling targets via `next::` within the same parent), then follows `next::` (relation, then `next::` field label); remove the dependence on `children[0]`.
- [x] 1.3 GREEN `RT`: the sibling tie-break is document order, not `localeCompare`; delete the alphabetical fallback.
- [x] 1.4 `STEP`: consume the runtime chain only; delete the local `firstChild`/`nextStep` fallback paths used for ordering.
- [x] 1.5 Rebuild `BUNDLE`; regenerate the testlab fixture; `node scripts/verify.js --only=console`.
- [x] 1.6 Mutation check: reverting 1.2 turns 1.1 red (no vacuous pass).

## Slice 2: One owner of tree semantics (spec: innfo-console-runtime "One Owner Of Console Tree Semantics", "Procedure Stepper Runtime" MODIFIED; design D3)

- [x] 2.1 RED: grep-style test — `STEP` contains no `sortChildren`/`chainOf`/`firstChild`/`nextStep`/`resolveParentId`/`cleanRef` definitions and no ordering logic.
- [x] 2.2 GREEN `STEP`: remove the duplicated tree helpers and their `RT.*`-or-fallback branches; call `RT` directly; keep the "runtime not available" state for the no-runtime case.
- [x] 2.3 Rebuild `BUNDLE`; regenerate the testlab fixture; `node scripts/verify.js --only=console`.

## Slice 3: Structural diagnostics (spec: innfo-console-runtime "Procedure Structure Defects Are Visible"; design D2, D8)

- [x] 3.1 RED: `RT` reports a `StructuralDefect` for a cycle, a fork (two heads), a `next::` outside the parent, and an unreachable step; the view renders a structure summary (`N procedures · M steps · K ungrouped`) and one line per defect naming the element.
- [x] 3.2 GREEN `RT`: collect defects while building the tree/chain; expose a summary with the tree.
- [x] 3.3 GREEN `STEP`: render the structure strip from the summary; a document with no root `Work` shows the ungrouped count instead of a silent wall of tabs.
- [x] 3.4 Rebuild `BUNDLE`; regenerate the testlab fixture; `node scripts/verify.js --only=console`.
- [x] 3.5 Mutation check: removing the defect collection turns 3.1 red.

## Slice 4: Scoped procedure listing & file identity (spec: console-payload-builder "Procedure Catalog Link Is Emitted" MODIFIED; design D5; aligned with Q15)

- [x] 4.1 Under Q15 ("one document = one procedure"), the data source for available procedures is the scoped procedure listing (`list_blueprint_procedures({ path })`). The procedure document itself (`*_procedures_NN.md`) provides procedure identity and contains its `Work` steps.
- [x] 4.2 Payload builder and console export preserve all procedures without dropping duplicates, marking clashing entries as `shadowed` with `shadowed_by` (shipped in L2.5.3).

## Slice 5: Tab shows the procedure metadata (spec: innfo-console-runtime "Procedure Tab Shows The Catalog Entry" MODIFIED; design D6; aligned with Q15)

- [x] 5.1 RED: the procedure stepper renders procedure metadata (`summary`, `category`, `executed_by`, `inputs_required`, `outputs_expected`) directly from the active procedure document / catalog entry; non-shadowed procedures are listed in the stepper.
- [x] 5.2 GREEN `STEP`: render the procedure header; omit missing fields.
- [x] 5.3 Rebuild `BUNDLE`; regenerate the testlab fixture; `node scripts/verify.js --only=console`.

## Slice 6: Decision steps render as branches (spec: innfo-console-runtime "Decision Steps Render As Branches"; design D7)

- [x] 6.1 RED: a `decision` step with two `next::` targets renders both outcomes; a `decision` with one target renders as a normal step; the `next::` references are unchanged.
- [x] 6.2 GREEN `STEP`: branch rendering for multi-target decisions.
- [x] 6.3 Rebuild `BUNDLE`; regenerate the testlab fixture; `node scripts/verify.js --only=console`.

## Slice 7: Blueprint template and self-contained shape (spec: design D9; `BP`; aligned with Q15)

- [ ] 7.1 `BP`: the template section shows the self-contained procedure document (`<verb>_<noun>_procedures_NN.md`) with `Work` elements as execution steps.
- [ ] 7.2 Document the "structure fix" assistant: it reports a missing root `Work`/`parent::` and suggests the patch; it never edits the domain (mirror video-series `D16`).
- [ ] 7.3 `node scripts/verify.js --only=procedures`; blueprint immutability guard passes with the version bump if `BP` changes.

## Final

- [x] Full `node scripts/build-console-bundle.mjs` + drift check green.
- [x] Regenerate `test/fixtures/testlab/domaiNN_console.html` and commit it in the session branch.
- [ ] `node scripts/verify.js` green; CI green on `dev`.
