# Design: Changes as a Console Collection

## Technical Approach

Declare `changes` with `nature: { structure: members, ownership: derived }` (mechanism of
change A). The console materializes **one unit per `Change`** into the domain payload and
renders it through the standard unit machinery. The builtin `Changes` tab and its bespoke
loader are removed. `el.history` (per-element history) is untouched.

## Verified facts

| Fact | Evidence |
|---|---|
| The builtin tab is hardcoded. | `console/nn-runtime.js`: `tabs.push({ id: 'review', title: 'Changes', ... })` |
| Changesets are loaded outside the model pipeline. | `scripts/export-console.mjs:812` (`loadChangesetRecords`), `:824` (`specNames: ['changes']`) |
| A `Change` is an element of the `Change` concept, distributed across batch files. | `iNNfo/specs/bluepriNNts/changes/spec_NN.md` §Template |
| Change records carry `op/target/from/to/author/status/evidence`. | `console/element-history.ts:101-149`; change C |
| Per-element history already exists. | `console/element-history.ts` `attachChangesetHistory` |

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| D1 Structure | `members` (N batch docs, one `Change`-element set each) | `catalog` (one flat doc) | Keeps write-once/seal/concurrency (change C, D6) |
| D2 Ownership | `derived` | `authored` | Changes are provenance, never proposed-to-change |
| D3 Unit | one per `Change` (op) | one per batch doc | The user reads `op/from/to`, not the batch header |
| D4 Drafts | runtime affordances on `pending` units | a second collection source | Drafts are local (localStorage); the export is offline |
| D5 Tab | retire the builtin `Changes` tab | keep both | A standard name must not be squatted by a bespoke surface |

## Data Flow

```
changes/*_changes_NN.md ──load──> Change records ──materialize(members)──> one unit per Change
      (batch = grouping)                                   │
                                                           v
                                   rail/search/facets + element sheet (status badge, evidence link)
      localStorage drafts ──runtime overlay──> `pending` units (discard / export)
```

## File Changes

| File | Change |
|---|---|
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` | declare `nature` (structure + ownership) |
| `iNNfo/specs/bluepriNNts/console/nn-runtime.js` | remove the builtin `Changes` tab + loader wiring |
| `scripts/export-console.mjs` | drop the `specNames: ['changes']` special case; materialize via the nature |
| `iNNfo/packages/nn-core/src/console/element-history.ts` | feed the collection materializer |
| `openspec/specs/**` | delta specs |

## Testing Strategy

| Layer | What | Where |
|---|---|---|
| Unit | the materializer emits one unit per `Change` with the right fields | nn-core vitest |
| Unit | `ownership: derived` ⇒ no edit pencil on `Change` units | console jsdom |
| Integration | `testlab` export has no builtin `Changes` tab and shows the change units | scripts suite |
| Integration | `el.history` unchanged | nn-core vitest |

## Migration / Rollout

Additive on top of change A. The tab removal is a visible behavior change; the per-element
history keeps working. Loses nothing: the retired tab's data already exists as changes.
