# Proposal: Console Procedure View — Structure From The Model, Loud Degradation

## Intent

The procedures console view **infers** a procedure's structure while rendering instead of
reading it from the model. It groups by `Work.parent`, orders the step chain with an
alphabetical heuristic, starts the chain at `children[0]`, never reads the `Procedure`
concept, and renders nothing when the shape it expects is absent. The result is silent
degradation that reads as "working": a flat wall of 71 tabs, a chain that dropped 3 of 13
steps, and a tab titled after a workflow root with the procedure's whole catalog ficha
(`summary`, `category`, `executed_by`, `inputs_required`, `outputs_expected`) invisible.

Make the view a **faithful projection of the model**: order steps by their declared `next`,
join the catalog (`Procedure`) with the execution tree (`Work`), render branches, and
surface every structural defect as a visible diagnostic instead of a guess. This is the
console half of a wider principle — the console is a projection of the `nn-model` slot and
must not re-derive semantics the model already declares.

Source: an audit of a real workspace (`video_NN`) that exposed the defects below. The
hard-correctness defect (dropped steps) is already filed as issue **#360**; this change is
the durable home for the fix plus the four design improvements that surround it.

## Evidence

| Gap | Where |
|---|---|
| Step order uses a non-total comparator (`next` adjacency, else `localeCompare`); `Array.sort` returns an arbitrary permutation | `iNNfo/specs/bluepriNNts/console/nn-runtime.js:644-657`; mirrored `render-procedure-stepper.js:522-536` |
| Chain head is `children[0]`, so every step before it is dropped | `nn-runtime.js:659-661,687-698`; `render-procedure-stepper.js:486-489,472-484` |
| Procedures are grouped only by `Work.parent`; the `Procedure` concept is never read | `render-procedure-stepper.js:87-113` |
| Tab label is only the root Work name — no catalog ficha | `render-procedure-stepper.js:450-467` |
| The `Procedure` elements carry **no relations** in the exported payload; the link to the executable model exists only as a `procedure_model::` path field | `nn-model` slot of `domaiNN_console.html` (verified: 9 `Procedure`, 0 relations; 9 root `Work`) |
| A malformed document produces no diagnostic — 71 parentless `Work` render as 71 tabs | observed in `video_NN` before the data fix |
| Tree logic is duplicated: the stepper redefines `cleanRef`/`sortChildren`/`nextStep`/`resolveParentId` (delegating to `RT.*` with a local fallback) | `render-procedure-stepper.js:491-544` |
| The step chain is linear; `step_type:: decision` renders as an ordinary step | `render-procedure-stepper.js:405-446`; `step_type:: decision` seen in `video_NN` |
| The blueprint template shows only the catalog tier; the canonical combined shape (root `Work` + `parent::` links) is not shown | `iNNfo/specs/bluepriNNts/procedures/spec_NN.md:206-232` vs `bluepriNNts/visual-catalog/procedures/ingest_visual_catalog_procedures_NN.md:23-45` |
| The only stepper unit test uses a fixture with **no** `next` relations, so the defect is invisible to CI | `test/console-procedure-view.test.mjs:28-31` |

## Scope

### In Scope

1. **Deterministic step order (P1, issue #360).** The chain is derived from declared
   references: the head is the step no sibling targets with `next::`, and the chain follows
   `next::` within the same parent. Cycle, fork, or disconnected step → a visible
   diagnostic, never an alphabetical guess. Aligns the console with the already-specified
   `procedure-execution` "Step-Order Execution".
2. **One owner of tree semantics (P4).** `nn-runtime.js` is the single implementation of
   `buildTree`/`chainOf`/`sortChildren`; the stepper consumes it and keeps no parallel
   fallback that can drift.
3. **Catalog ↔ execution join (P2, data).** The payload emits the `Procedure`→executable
   model link (the `procedure_model::` field materialized as a relation, or a `procedure::`
   back-reference on the root `Work`), so the view joins by key, not by name convention.
4. **The tab shows the procedure (P2, view).** The wizard header renders the catalog ficha
   (`summary`, `category`, `executed_by`, `inputs_required`, `outputs_expected`) above the
   step list.
5. **Loud degradation (P3).** A structure summary ("N procedures, M steps, K ungrouped")
   plus per-defect warnings: missing root `Work`, orphan step, broken `next`, cycle.
6. **Branch rendering (P5).** A `step_type:: decision` step with more than one `next`
   renders as a branch with labelled outcomes, not a single "next" arrow.
7. **Scaffolder guidance (P6).** The `procedures` blueprint template shows the combined
   canonical shape; a documented "structure fix" reports (or suggests) the root `Work` +
   `parent::` links a malformed document is missing.

### Out of Scope

- Re-parsing markdown in the console: the view MUST keep consuming the structured
  `nn-model` slot only.
- A video/overlay review console (`backlog.md` item 34) — separate capability.
- Changing the `Procedure`/`Work` concept model itself (the blueprint stays; only the
  catalog link becomes a relation).
- Migrating existing domains' procedure documents (the `video_NN` data fix was applied
  out-of-repo; the scaffolder only suggests).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `innfo-console-runtime`: deterministic chain derivation, single tree owner, loud
  structural diagnostics, catalog join and ficha rendering, branch rendering.
- `console-payload-builder`: emit the `Procedure`→executable-model link as a relation.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Materializing `procedure_model` as a relation changes the payload contract other views read | Med | Additive only; a new relation on `Procedure`, no field removed; golden-payload test |
| Deriving the head by "no incoming `next`" mis-handles a document with two heads (a real fork) | Med | Fork → diagnostic, both heads rendered; a test pins the two-head case |
| The existing stepper fallback (`render-procedure-stepper.js`) is used standalone somewhere | Low | Grep proves it is only reached when `RT.*` is missing; the standalone path boots the same bundle |
| Diagnostics that fire on legitimate shapes train users to ignore them | Med | Fire only on defects; each warning names the element and the expected shape |

## Rollback Plan

Revert the slice commits on `dev`. The runtime returns to the heuristic order; no model
data migrates; the new `Procedure` relation becomes an inert extra relation read by
nobody. The `video_NN` domain data fix is out of repo and unaffected.

## Dependencies

- Issue **#360** (`bug(console): procedure stepper drops leading steps`) is the P1 slice;
  this change absorbs it.
- None on `#357`/`#358` (engine TTS/overlay) — same origin audit, separate subsystem.

## Resolved Assumptions

| # | Assumption | Status |
|---|---|---|
| 1 | The step-chain order rule is the one already in `procedure-execution` ("head = step no sibling targets with `next::`") | Maintainer-confirmed by existing living spec |
| 2 | The catalog link becomes a relation in the payload, not a name-convention join | Proposed, pending review |
| 3 | A malformed structure renders with warnings, never blocks the view | Proposed, pending review |
| 4 | Branch rendering is presentation-only (the agent protocol still walks `next::`) | Proposed, pending review |
| 5 | The scaffolder *suggests* a fix; it never edits a domain document | Proposed, pending review |

## Success Criteria

- [ ] A procedure whose head step is not alphabetically first renders its full chain from
      the head, with no step dropped (RED-then-GREEN on the `#360` repro).
- [ ] A document with a fork, a cycle, or an orphan step renders a diagnostic naming the
      element; it never silently drops or reorders steps.
- [ ] `render-procedure-stepper.js` contains no tree-ordering logic of its own; ordering
      lives only in `nn-runtime.js`.
- [ ] A `Procedure` element's tab shows its `summary`, `category`, `executed_by`,
      `inputs_required` and `outputs_expected`.
- [ ] The payload emits the `Procedure`→executable-model link as a relation, and the view
      joins on it (no name matching).
- [ ] A `decision` step with two outcomes renders as a branch with both outcomes visible.
- [ ] The `procedures` blueprint template shows the combined catalog+execution shape.
- [ ] `node scripts/verify.js` is green; the bundle drift check passes.
