# Tasks: Console Filter Semantics (slice 1 only)

Scope: console only. No edits to `queryUnits.ts`, `sourceRef.ts`, `unit-address.ts`. Strict TDD: every GREEN task is preceded by a RED task. Line anchors are from `dev` at 4e8c30d7 (`R` = `iNNfo/specs/bluepriNNts/console/nn-runtime.js`, `T` = `test/console-rail-filter.test.mjs`). Targeted runner: `node --test test/console-rail-filter.test.mjs`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (hand-written) | ~800-950 (R ~300 add / ~220 del; T ~350; docs ~40; spec 1) |
| Estimated changed lines (generated, counted separately) | bundle ~ R delta, testlab `domaiNN_console.html` ~ R delta |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (units a, c) -> PR 2 (unit b) -> PR 3 (units d, e, f, regen) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Seam + exact equality + clause model + single evaluation (sections 1-2) | PR 1 | Base per chain strategy; tests included; regenerate bundle/fixture at end |
| 2 | `serializeQuery`/`editQuery` and the 9 rebuild sites (section 3) | PR 2 | Depends on PR 1 (`groups` with `form`); regenerate at end |
| 3 | Per-model rail counts, pill connectors, docs, final regeneration (sections 4-7) | PR 3 | Depends on PR 2 |

## Sequencing

Branch `claude/filter-direct-fixes-daeccf` (376a07ce: text-pill re-quoting, Sheets empty state, unknown `is:` marker) edits code that `editQuery` replaces (text-pill x, R L1495-1500). Apply slice 1 after it lands on `dev`, or drop the overlapping hunk when rebasing. Re-read R line anchors after the rebase.

## 1. Predicate seam and exact equality (unit a)

- [ ] 1.1 RED: in `T`, add `matchPredicate` to the exported API list (`PUBLIC_API`) and add a table test of `matchPredicate`: `eq` exact and case-fold, NFC `Zoé`/decomposed, trim, `any`, `not` (absent value gives true), `gt/gte/lt/lte`, `n/a` gives false, absent value false for every op except `not`
- [ ] 1.2 GREEN: in `R` after `getElementFieldValue` (~L389) add `canonicalFilterValue`, `toFilterItems`, `matchPredicate` (comment: mirror of nn-core `queryUnits.ts`, slice 3 replaces it); export `matchPredicate`
- [ ] 1.3 RED: finding 2/3 tests: `field:status=active` excludes `inactive`; `!field:status=active` keeps `inactive`; `field:status` is presence in both polarities (A4); `concept:task` excludes `Subtask`; `model:plan` excludes `plan_v2`; `element:`/`id:`/`name:` exact (A3); multi-target relation matches by label (A7); bare text `task` still lists `Subtask`
- [ ] 1.4 GREEN: rewrite `matchAtom` (R L390-485) as a mapper (strip `!`/`-`, resolve subject per the design table, `toPredicate`, empty value matches first); `is:`/`has:`/text stay local; delete `valueKey` (R L345) and the `selectFields` map plus `schema` read in `filterElements`
- [ ] 1.5 GREEN: make the relation fallback in `getElementFieldValue` (R L350-389) return an array of labels instead of `join(', ')`
- [ ] 1.6 RED+GREEN (finding 4): render the Fields facet over audit-like values (`TestLab_intake_TestLab`, `reviewed`, `to:reviewed`); assert that for each badge, `filterElements(field:value).length` equals the badge; fix any residual mismatch in the facet counter
- [ ] 1.7 Update existing tests in `T`: L146-149 use `element:ecto-1`, `element:"Ghost Mobile"`, and `-element:pack-1` (exact `-element:pack` would now exclude nothing)
- [ ] 1.8 REFACTOR: confirm `matchAtom` has no inline equality, any-of, negation or comparison outside the seam; run `node --test test/console-rail-filter.test.mjs`

## 2. Clause model and single evaluation (unit c)

- [ ] 2.1 RED (finding 5): `a:1 OR b:2 c:3` parses to clauses `[[a,b],[c]]`; `parseFilterQuery` exposes `groups` as `{atoms, form}` with `form` in `plain|paren|merged`; add `parseFilterQuery` to `PUBLIC_API`
- [ ] 2.2 RED (finding 6): `concept:work concept:plan status:x OR status:y` lists Work/Plan elements with the status clause as OR; `tags:core tags:ai` stays AND; `status:draft OR status:published tags:core tags:ai` keeps tags AND
- [ ] 2.3 GREEN: `parseFilterQuery` (R L247-341) records `form` per clause, calls a new `normalizeClauses` (drop empty, single atom becomes `plain`, merge positive `concept:` and `model:`/`file:` single-atom clauses into one `merged` clause; negated atoms never merge), returns `{groups, operators}`; delete `textTokens`; `operators` is the flat view of `groups`
- [ ] 2.4 GREEN: collapse `filterElements` (R L487-572) to one path `groups.every(c => c.atoms.some(a => matchAtom(...)))` with lazy `hay` in `mctx`; delete `hasExplicitLogic` (R L508) and the `modelOps/conceptOps/otherOps` branch
- [ ] 2.5 GREEN: update consumers that read `textTokens`/fallback: pill guard (R L1485) and `displayGroups` fallback (R L1557) use `parsed.groups.length`; confirm L1068, L1336, L1361, L1672, L1893 still read `operators` unchanged
- [ ] 2.6 GREEN: add the `ponytail:` comment above `parseFilterQuery` (flat boolean model, D3; reopen when someone needs `(a AND b) OR c`)
- [ ] 2.7 Run `node --test test/console-rail-filter.test.mjs`; regenerate bundle and fixture (section 6) at the PR 1 boundary

## 3. One reconstruction path (unit b)

- [ ] 3.1 RED: `editQuery('status:draft OR status:published', add concept Work)` equals `status:draft OR status:published concept:Work`; boot test shows more than 0 cards (finding 1); add `serializeQuery`, `editQuery` to `PUBLIC_API`
- [ ] 3.2 RED: unit tests per edit type: `add` (no-op when present, same polarity), `remove`, `toggle`, `removeAt`, `clearKeys` (strips `!`/`-`), `join` (gives `paren`), `split` (halves keep `paren` if more than 1 atom); `(a:1 OR b:2) c:3` minus `c:3` gives `(a:1 OR b:2)`
- [ ] 3.3 RED: round-trip: fixed corpus (plain, OR, parenthesized, negated, quoted, any-of, merged concepts, values with parens/quotes) plus seeded PRNG generator (no new dependency); assert `shape(parse(serialize(g))) === shape(g)` and idempotence of `serialize(parse(q))`
- [ ] 3.4 GREEN: in `R` next to `formatFacetToken` (~L1656) add `serializeQuery` (atom `raw` else `formatAtom`; clauses joined by a space, A8) and `editQuery`; update quoting in `formatAtom` and `formatFacetToken` (empty, `/[\s()"']/`, text `OR`/`AND`; single quotes when value has `"`; skip values with both)
- [ ] 3.5 RED+GREEN per site (boot test each, query preserved): `toggleFacet` R L1073-1106; mClear L1159-1175; cClear L1251-1267; fClear L1447-1464; text-pill x L1495-1500; join connector L1592-1606; split connector L1618-1631; `selectRailToken` L6455-6488 (non-operator token still replaces the query); `addFacetToken` L6492-6499 (presence check moves into `add`)
- [ ] 3.6 REFACTOR: delete the old rebuild bodies and `serializeGroups` (R L1561); `rg "textTokens|serializeGroups" iNNfo/specs/bluepriNNts/console/` returns nothing; metamodel click (L5355), Clear filters (L1479) and the search input still set the whole query
- [ ] 3.7 Run `node --test test/console-rail-filter.test.mjs`; regenerate at the PR 2 boundary

## 4. Per-model rail counts (unit d)

- [ ] 4.1 RED (finding 7): rail concept under a model shows that model's count (testlab Concept 1 under Intake = 1, not 4); click query is `concept:"Concept 1"` with no `model:` clause
- [ ] 4.2 GREEN: in `renderRail` (R L1661-1863) build `countsByModel[mid][concept]` from `state.elements` keyed `String(e.modelId || e.modelFile)` (as `conceptNamesForModel`); use it at R L1795; flat branch keeps `counts`

## 5. Pill connectors (unit e)

- [ ] 5.1 RED: pills between merged concepts show an active OR with AND `disabled` + `aria-disabled="true"` and a title stating repeated concept/model filters always combine with OR; `concept:Concept` pill label is the raw value, not "Concept 1"; tooltip keeps the "combine with AND" phrase
- [ ] 5.2 GREEN: `displayGroups = parsed.groups`; AND toggle (`join`) between clauses, OR toggle (`split`) inside `plain`/`paren`, locked AND inside `merged`; pill label uses exact `conceptByName` only (fuzzy stays in `activeGuideConcept`, R L1893); reword the shared tooltip
- [ ] 5.3 Update existing connector tests at `T` L235 (segmented control rewrites query); L34 and L283 stay unchanged

## 6. Documentation

- [ ] 6.1 Add a "Filtering" section to `docs/documentation/content/how-to/domain-console.md`: exact vs free text, flat model and its limit (nesting, `k:z OR (a b)`), and the boundary "deterministic filtering lives in nn-core, search ergonomics live in the console"
- [ ] 6.2 Run the docs gate that covers `docs/documentation/` (via `npm run verify:fast`)

## 7. Regeneration and verification

- [ ] 7.1 `node scripts/build-console-bundle.mjs`
- [ ] 7.2 `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`; commit the fixture (nn-dev-development 2d)
- [ ] 7.3 `node --test test/console-rail-filter.test.mjs`, then `npm run verify:fast` (no `npm ci`)
- [ ] 7.4 Manual check on the testlab console, each audit reproduction: (1) OR query + tick concept keeps results; (2) `field:status=active` vs `inactive`; (3) `concept:task`/`model:plan` and pill label; (4) badge equals result count for `target:TestLab_intake_TestLab` and `to:reviewed`; (5) `a:1 OR b:2 c:3`; (6) pills between concepts show OR; (7) Concept 1 under Intake shows 1
- [ ] 7.5 Confirm success criteria: 7 findings each have a RED-then-GREEN test, zero badge/result disagreements, one reconstruction function, `node scripts/verify.js` green
- [ ] 7.6 Commit in work units on `dev` per the chosen chain strategy; conventional commits, no AI attribution; state the substring-to-exact change in the commit body

## 8. Slice 2 and 3 handoff (FUTURE, NOT part of slice 1 apply)

- [ ] 8.1 (FUTURE, slice 2, imports session owns `queryUnits.ts`) Confirm module name/ownership of `iNNfo/packages/nn-core/src/filterPredicate.ts` (design open question)
- [ ] 8.2 (FUTURE, slice 2) Extract self-contained `filterPredicate.ts` (no `sourceRef` import): `canonicalFilterValue`, `matchPredicate('eq'|'any'|'not', items|null, arg)` with absent items true only under `not`; `queryUnits.ts` imports both
- [ ] 8.3 (FUTURE, slice 2) nn-core vitest parity: for each `(field, value)` in a fixture, `runQuery` URIs equal sections where `matchPredicate('eq', ...)` holds
- [ ] 8.4 (FUTURE, slice 3) Add `scripts/export-filter-module.mjs` (copy of `export-address-module.mjs`, global `nnFilter`, `--check`); register `nn-filter.generated.js` in `scripts/lib/console-bundle.js` and `console-bundle.test.js`
- [ ] 8.5 (FUTURE, slice 3) RED console parity test: `filterElements('field:k=v')` over the testlab JSON slot equals `runQuery` over testlab model files by element slug; then swap the `matchPredicate` body for `eq`/`any`/`not` over equality, keep comparisons local, delete local `canonicalFilterValue`; regenerate bundle and fixture
