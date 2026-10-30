# Design: Console Procedure View — Structure From The Model

## Technical Approach

The procedures view becomes a pure projection of the `nn-model` slot. One runtime
(`nn-runtime.js`) owns every structural operation — tree build, chain derivation,
ordering, diagnostics — and the stepper view consumes it without a parallel
implementation. Order and head come from the **declared** `next::` references, never from
`Array.sort`'s residual order. The payload gains the one link the view is missing (the
`Procedure`→executable-model reference) as a relation, so the catalog tier and the
execution tier join by key. Every place the model is malformed, the view renders a
diagnostic naming the element; it never guesses.

Paths: `RT` = `iNNfo/specs/bluepriNNts/console/nn-runtime.js`; `STEP` =
`iNNfo/specs/bluepriNNts/console/render-procedure-stepper.js`; `BP` =
`iNNfo/specs/bluepriNNts/procedures/spec_NN.md`; `PAYLOAD` =
`iNNfo/packages/nn-core/src/console/`.

## Architecture Decisions

| # | Topic | Choice | Rejected | Why |
|---|---|---|---|---|
| D1 | Chain derivation | `chainOf(root)` finds the **head** as the child no sibling targets via `next::` (within the same parent), then follows `next::` (relation first, then the `next::` field label). It MUST NOT read `children[0]`. | Fix `sortChildren` only | Fixing the comparator still trusts index 0; deriving the head from the graph removes the assumption entirely |
| D2 | Ambiguity is a diagnostic | No head (cycle), two heads (real fork), `next::` pointing outside the parent, or a step unreachable from the head → a `StructuralDefect` recorded and rendered. The chain is built best-effort and flagged. | Throw (blocks the view); ignore (today) | The view must stay usable and must show *why* it looks incomplete |
| D3 | Single tree owner | `buildTree`/`chainOf`/`firstChild`/`nextStep`/`sortChildren`/`cleanRef`/`resolveParentId` live only in `nn-runtime.js`. `STEP` deletes its local copies and fallbacks; when `RT` is absent the view reports "runtime not available" (already its contract). | Keep the local fallback | Two implementations of one contract drift — exactly the bug's origin (`STEP` re-declared the same comparator) |
| D4 | Order fallback | When `next::` does not order two siblings (no relation between them and no head edge), the tie-break is **document order** (the order the elements appear in the model), never `localeCompare`. | Alphabetical | Document order is stable and meaningful; alphabetical is semantically wrong for a workflow |
| D5 | Procedure Identity & Data Source (Q15 aligned) | Under Q15, "one document = one procedure" (identity is the document: `*_procedures_NN.md`). The authoritative data source for procedures is the scoped procedure listing (`list_blueprint_procedures({ path })`) / runtime tree. `Work` elements are steps only. An ad-hoc `procedure_model` relation across separate files is replaced by file identity; the hand-written catalog becomes a derived view later (deferred `aggregate`). | Ad-hoc `procedure_model` relation joining separate files | File identity and scoped listing provide a single source of truth without disconnected documents |
| D6 | Ficha in the tab (Q15 aligned) | The wizard header renders the procedure's metadata (`summary`, `category`, `executed_by`, `inputs_required`, `outputs_expected`) directly from the procedure document itself (or catalog when present). Only `selected` procedures are selectable in the stepper; `shadowed` procedures are reported with `shadowed_by`. | Show only root Work name | Procedure document carries its own metadata; scoped listing governs availability |
| D7 | Branch rendering | A `decision` step with ≥2 `next::` targets renders as a branch node listing each outcome (label from the target's name/`condition`). A single-target `decision` renders as a normal step. The step-list stays the source; this is presentation. | Full graph/DAG renderer | Smallest change that stops the linear list from lying |
| D8 | Diagnostics surface | One "Structure" strip at the top of the view: counts (`N procedures · M steps · K ungrouped`) and one line per defect (element + shape expected). Diagnostics come directly from `list_blueprint_procedures({ path })` / runtime tree; no second validator. | Re-run `validate_knowledge` in the browser | The runtime already has the tree; defects fall out of building it |
| D9 | Scaffolder guidance (Q15 aligned) | `BP`'s template section shows the self-contained procedure document (`<verb>_<noun>_procedures_NN.md`) with `Work` elements as execution steps. A documented assistant reports missing root `Work`/`parent::` for legacy documents and suggests the patch; it never edits the domain. | Separate catalog and execution files | Unifies document identity across cascade, MCP, and console |
| D10 | Test fixtures carry invariants | The stepper suite's fixture includes a `next::` chain whose head is **not** alphabetically first, a fork, a cycle, and a `Procedure`↔`Work` pair. Mutation check: removing the head logic turns the suite red. | Keep the relationship-free fixture | The current fixture (`test/console-procedure-view.test.mjs:28-31`) has no `next`, so it cannot catch the defect |

## Structure Model

```
Procedure (catalog)              Work (execution tree)
  summary::                        root Work  (no parent)      <- head of the chain
  category::            procedure_model::  ─────────┐
  executed_by::                                  relation (D5)
  inputs_required::                                 │
  outputs_expected::             step (parent:: root)  ◄──────┘
                                   next:: step ...
                                   next:: step ...   (or ≥2 → branch, D7)
```

`chainOf(root)` = root, then the head child, then each `next::` (D1). Siblings never
ordered by name (D4). Defects collected while building (D2) feed the strip (D8).

## Data Flow

```
nn-model slot ─buildTree→ nodes{children, parentId, relations}
                        └─ chainOf(root)  ─ heads, next:: walk, tie-break doc order
                                          └─ StructuralDefect[]  → Structure strip (D8)
Procedure.rel(procedure_model) ──────────► tab ficha (D6) ; head Work = target
step_type:: decision + ≥2 next:: ────────► branch node (D7)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `.../console/nn-runtime.js` | Modify | D1 chain head + doc-order tie-break; D2 `StructuralDefect`; D8 summary; keep as sole tree owner |
| `.../console/render-procedure-stepper.js` | Modify | D3 drop local tree fallbacks; consume `RT`; D6 ficha header; D7 branch node; D8 strip |
| `.../console/console-view-procedure.js` (view registration) | Modify | Pass the ficha/defects through to the stepper mount if not already on the payload |
| `.../bluepriNNts/procedures/spec_NN.md` | Modify | D5 `Procedure` gains the `procedure_model` reference field; D9 template shows the combined shape |
| `iNNfo/packages/nn-core/src/console/*` (payload builder) | Modify | D5 emit the `Procedure`→root-`Work` relation |
| `iNNfo/specs/bluepriNNts/console/nn-console.bundle.js` | Rebuild | `node scripts/build-console-bundle.mjs`; drift check must pass |
| `test/console-procedure-view.test.mjs` | Modify | D10 fixture with a non-alphabetical head, fork, cycle, catalog pair |
| `test/fixtures/testlab/domaiNN_console.html` | Regenerate | `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open` |
