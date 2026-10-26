# Proposal: Console Filter Semantics

## Intent

The domaiNN console filter (`iNNfo/specs/bluepriNNts/console/nn-runtime.js`) returns results that contradict what its own UI shows. The deterministic part of filtering should mean the same thing in the console as in nn-core, and every UI action should keep the query the user wrote.

## Why Now

An audit on 2026-10-26 reproduced these against `test/fixtures/testlab`:

1. Facet toggles, pill removal and rail clicks rebuild the query from flat operators, dropping OR and parentheses (`status:draft OR status:published` + concept tick gives 0 results). There are 6+ duplicated rebuild sites.
2. `field:x=v` is substring (`active` matches `inactive`); `select` is exact; negation over-excludes.
3. `concept:`/`model:` are substring (`concept:task` matches `Subtask`); the pill label resolves fuzzily and names a different concept than the one matched.
4. Facet badge counts are exact, results are substring: 7 of 147 testlab values disagree.
5. Parentheses are flat OR clauses with no nesting, and this limit is not documented.
6. Two evaluation modes: adding any OR flips unrelated facets to strict AND, and the pills show "AND" where the engine applies OR.
7. A rail concept under a model shows the global count.

Issue cogNNitive#329 tracks the wider problem: two query languages that have drifted apart.

## Scope

| Slice | Content | Owner |
|---|---|---|
| 1 | Console only: D1–D5 below, `test/console-rail-filter.test.mjs` updated, delta spec, boundary documented, bundle and testlab fixture rebuilt | this change |
| 2 | nn-core exports a pure equality predicate and `op.` any-of/negation, with a parity test against `query_units` | handoff to the imports session (it owns `queryUnits.ts`) |
| 3 | Point the console seam at a generated nn-core browser module (`export-address-module.mjs` pattern) and delete the local any-of/negation | this change, after slice 2 |

### Non-goals

- Typed numeric comparisons in nn-core.
- Model-scoped concept click.
- Nested boolean expressions.
- Editing `queryUnits.ts`, `sourceRef.ts`, `unit-address.ts`.
- Building on the `@concept:slug` address shape.
- The minor fixes already on `claude/filter-direct-fixes-daeccf`.

## Approach (binding maintainer decisions)

| # | Decision | Rejected alternative and why |
|---|---|---|
| D1 | Facet/field matching is exact after NFC, trim and case-fold (nn-core `canonicalFilterValue`). Substring survives only in free-text search. Fixes 2, 3, 4 | Keep substring: badge counts and results stay inconsistent and the console diverges from nn-core |
| D2 | One seam, `matchPredicate(op, value, arg)`. Any-of and negation are local now and move to nn-core `op.` later. Numeric comparisons stay local until field typing is designed. Free text, the OR toggle, `is:` and `has:` stay console-local | Port everything to nn-core now: blocked on another session and on typing design |
| D3 | Flat boolean model with no AST. One reconstruction function built on `serializeGroups`, used by every rebuild site. Round-trip `parse(serialize(g)) == g`. Nesting gets a documented `ponytail:` limit | Full AST: overbuilt with no demand. Patching each site: the duplication comes back |
| D4 | One evaluation mode. Repeated `concept:`/`model:` merge into one OR clause at parse time. Every other key is AND (`tags:` contract kept). Pills show the real connector | Keep the dual mode: it is the root cause of 6 |
| D5 | Rail counts per model now. Scoped click waits for `model@concept?field=value` (#329) | `model:`+`concept:` pair: cartesian product on multi-select. New `scope:` syntax: a third grammar |

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `innfo-console-runtime`: `Field Facet Matching` changes from substring to exact. Adds requirements for one evaluation mode, query preservation across UI actions, the documented nesting limit, per-model rail counts and the nn-core/console boundary.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Users relying on substring facets lose matches | High (intended) | Free-text search keeps substring; the change is stated in the spec and the commit |
| Slice 2 is blocked on the imports session; `canonicalFilterValue` is not exported and `runQuery` works on file snapshots, not elements | Med | Slice 1 replicates the normalization locally behind the seam; slice 2 extracts a pure predicate (open question for design) |
| The address grammar replaces `@concept:` mid-flight | Med | Nothing in this change depends on it |

## Rollback Plan

Each slice is its own revertible commit set on `dev`. Reverting slice 1 restores the old runtime. The bundle and testlab fixture must be regenerated from the reverted sources. Nothing is persisted or published.

## Success Criteria

- [ ] All 7 findings have a failing-then-passing test in `test/console-rail-filter.test.mjs`.
- [ ] Zero badge/result disagreements on testlab facets.
- [ ] The round-trip test passes, and only one query-reconstruction function remains.
- [ ] `node scripts/verify.js` is green, and the bundle and testlab fixture are regenerated.

## Proposal question round

Not run: D1–D5 were already settled with the maintainer and are recorded as binding. Remaining open (for design, not product): whether slice 2 extracts a pure predicate instead of calling `runQuery`.
