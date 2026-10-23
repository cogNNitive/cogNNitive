# Proposal: Changes as a Console Collection — retire the bespoke Changes tab

## Why

The console ships a **hardcoded builtin "Changes" tab** (`iNNfo/specs/bluepriNNts/console/nn-runtime.js`:
`tabs.push({ id: 'review', title: 'Changes', icon: 'review', panelId: 'innfo-tab-review' })`),
fed by `loadChangesetRecords` **outside** the model pipeline. Two consequences the maintainer
hit directly:

- A standard name (`Changes`) is **squatted by a bespoke surface**, so changes cannot be a
  normal model and get a second-class UI (icons, filters, search, layout all bespoke and poorly
  formatted).
- `## NN Change:` are **already elements of the `Change` concept**, distributed across batch
  documents (the "members" structure already decided for the framework). The console can
  **materialize them as ordinary units** and reuse the element sheet, badges, facets and search.

## What Changes

- **Declare `changes` with `nature: { structure: members, ownership: derived }`** (the mechanism
  of change A). One unit per `Change` is materialized: `target`, `op`, `from → to`, `author`,
  `status`, `evidence`, `applied_at`; the batch document is the grouping/provenance.
- **Retire the builtin `Changes` tab** and its bespoke loader; the standard collection surface
  replaces it. The name `Changes` now belongs to the standard mechanism.
- **Keep the per-element history** (`el.history`, `attachChangesetHistory`) unchanged — that is
  *the changes of this element*, a different surface from the collection.
- **`ownership: derived` ⇒ no edit pencil** (per the framework); the runtime keeps the draft
  actions (discard / export) on `pending` units as review affordances, not as a change pencil.
- **Depends on** change A (nature + materializer) and change C (the final change model).

## Capabilities

### New Capabilities

- `changes-collection`: `changes` is a declared console collection (`structure: members`,
  `ownership: derived`); the console materializes one unit per `Change`.

### Modified Capabilities

- `console-view-registry`: the builtin `review`/`Changes` tab is removed from the registry.
- `console-ui-kit`: `Change` units render through the standard unit machinery; read-only.
- `console-architecture`: changes are a model like any other; no special-case loader.

## Impact

| Area | Impact | Description |
|---|---|---|
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` | Modified | Declare `nature` (structure + ownership) |
| `iNNfo/specs/bluepriNNts/console/nn-runtime.js` | Modified | Remove the builtin `Changes` tab + its loader wiring |
| `scripts/export-console.mjs` | Modified | Drop the `specNames: ['changes']` special case; materialize the collection via the nature |
| `iNNfo/packages/nn-core/src/console/element-history.ts` | Modified | Feed the collection materializer from the change records |
| `openspec/specs/**` | Modified | Delta specs for the capabilities above |

## Approach

Ordered work units, TDD-first.

| Unit | Content | Why this position |
|---|---|---|
| A. Nature | Declare `changes` `nature` and prove it materializes on `testlab` | Needs change A's mechanism |
| B. Materialize | One unit per `Change`, grouped by batch | Needs the model (change C) |
| C. Retire the tab | Remove the builtin tab + loader; keep `el.history` | Needs B |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| The retired tab carried behaviour the standard surface does not | Med | Map tab features to standard units/facets/actions; the draft (pending) layer is preserved |
| `changes` is behind the `roleOf` role filter (`changeset`) | Med | Change A derives the role from the declared nature; no hardcode |
| Per-element history is confused with the collection | Low | Both are specified separately; `el.history` is untouched |

## Rollback Plan

- Revert the merge commit. The builtin `Changes` tab and loader return; the nature declaration
  is additive.

## Dependencies

- Change A (`declarative-blueprint-nature`), change C (`provenance-as-changes`).

## Success Criteria

- [ ] `changes` surfaces as a normal console model; the builtin `review`/`Changes` tab is gone (`rg "title: 'Changes'"` returns 0).
- [ ] Each `Change` opens in the standard element sheet with its fields and `status` badge.
- [ ] `el.history` (per-element changes) is unchanged.
- [ ] `node scripts/verify.js` and CI are green on `dev`.

## Assumptions

1. The draft (pending, local) layer stays as runtime affordances on `pending` units (decision A of the provenance/console discussion), not as the collection source.
2. The batch document remains the physical boundary; it is the grouping, not a separate model.

## Review Workload Forecast

| Work unit | Est. changed lines (excluding generated) |
|---|---|
| A+B. Nature + materialize | ~250 |
| C. Retire the tab | ~120 |

- Chained PRs recommended: No.
- 400-line budget risk: Low.
- Decision needed before apply: No.
