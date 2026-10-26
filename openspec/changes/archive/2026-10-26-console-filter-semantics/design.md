# Design: Console Filter Semantics

## Context

All filter logic lives in `iNNfo/specs/bluepriNNts/console/nn-runtime.js` (plain ES5, UMD). Line numbers below are from `dev` at 4e8c30d7.

| Piece | Lines | Problem |
|---|---|---|
| `parseFilterQuery` | 247-341 | Returns `{ textTokens, operators, groups }`. `groups` already holds the AND-of-OR-clauses structure, but most consumers use the flat lists |
| `matchAtom` | 390-485 | Inline substring / select-exact / any-of / numeric / negation. `field:k` with no `=` returns `true` in both polarities |
| `filterElements` | 487-572 | Two modes, switched by `hasExplicitLogic` (L508) |
| Rebuild sites | 1073, 1159, 1251, 1447, 1497, 1592, 1618, 6455, 6492 | Each one rebuilds the query from `textTokens` + `operators`, which drops OR and parentheses |
| `serializeGroups` | 1561 | Already serializes clauses, but it is local to the pill renderer |
| `renderRail` | 1661-1863 | Uses the global `counts[name]` under every model (L1795) |

nn-core (`iNNfo/packages/nn-core/src/queryUnits.ts`, read-only in slice 1): `canonicalFilterValue` = `normalize('NFC').trim().toLowerCase()` and is not exported. `runQuery(parsed, files: FileSnapshot[])` picks one file from markdown/CSV snapshots, scans sections with `scanSections`, and returns `@` URIs plus diagnostics. Its predicate is inline: `items.some(i => canon(i) === canon(value))`, and a missing field is `false`. Filters are AND only, and `op.` is reserved.

## Decisions

| # | Choice | Rejected | Why |
|---|---|---|---|
| A1 | One module-level `matchPredicate(op, value, arg)` with a local `canonicalFilterValue` copy | Import from nn-core now | The function is not exported, and another session owns the file |
| A2 | Any-of covers equality only (`a\|b`). A `\|` list never contains comparators | Keep mixed `>3\|<1` | Undocumented and untested. It would keep a local any-of alive after slice 3 |
| A3 | `element:`/`id:`/`name:` become exact | Keep them substring | D1: substring survives only in free text, and bare text still finds partial names |
| A4 | `field:k` (no `=`) means presence (`has:k`), and negation inverts it | Ignore the atom | The spec allows either. Presence has an obvious meaning in both polarities |
| A5 | A clause is an object `{ atoms, form }` with `form` = `plain` \| `paren` \| `merged` | Arrays with ad-hoc properties; an AST | A flag is needed to keep the written form (`a OR b` vs `(a OR b)`), as both spec scenarios require. Still a flat list |
| A6 | Delete `textTokens`. Keep `operators` as a read-only flat view derived from `groups` | Delete both | Six read-only consumers need "which concepts/models/fields are active". Without `textTokens`, the old rebuild pattern can no longer be written |
| A7 | Relation fallback in `getElementFieldValue` returns an array of labels | Keep `join(', ')` | Exact equality against a joined string breaks every multi-target relation |
| A8 | Clauses serialize joined by a space (implicit AND) | `' AND '` (today's `serializeGroups`) | Matches what users type and what the existing tests expect (`concept:Alpha concept:Beta`) |

## (a) Predicate seam

Placed right after `getElementFieldValue` (around L389). `valueKey` is deleted and its only caller (L475) moves into the seam.

```js
// Mirror of nn-core queryUnits.ts canonicalFilterValue (slice 3 replaces it).
function canonicalFilterValue(v) { return String(v).normalize('NFC').trim().toLowerCase() }
// value -> string[] | null. null/undefined/''/[] -> null; array -> members;
// object -> JSON.stringify (same as the facet observedValues); scalar -> [String(v)].
function toFilterItems(value) { ... }
function matchPredicate(op, value, arg) { ... }
```

| `op` | `arg` | True when |
|---|---|---|
| `eq` | string | some canon(item) === canon(arg) |
| `any` | string[] | some item matches some arg (eq) |
| `not` | `{ op, arg }` | `!matchPredicate(arg.op, value, arg.arg)`. An absent value gives true |
| `gt` `gte` `lt` `lte` | number | some `parseFloat(item)` compares true. NaN gives false |

An absent value (`null` items) is false for every op except `not`. `matchAtom` becomes a mapper. It strips `!`/`-` and resolves the subject:

| Key | Subject |
|---|---|
| `concept` | `el.concept` |
| `model` / `file` | `[el.modelId, el.modelFile, el.modelTitle]` |
| `element` / `id` / `name` | `[el.id, el.name]` |
| `field:k=v` | the field value |
| any other key | `getElementFieldValue(el, key)` |

It then builds the predicate (`toPredicate(val)`): a leading `>=`/`<=`/`>`/`<` plus a number gives a comparison; a `|` list gives `any`; otherwise `eq`. Negation wraps the result as `{op:'not', arg:p}`. An empty value matches everything (checked first, before field presence). `is:`, `has:` and text atoms stay console-local and do not go through the seam. The `selectFields` map and the `schema` read in `filterElements` are deleted.

Slice 3 changes only the body: `eq`/`any`/`not` over `eq`/`any` delegate to `nnFilter.matchPredicate(op, toFilterItems(value), arg)` (loaded like `getnnSlug`, L29). Comparisons, and `not` over a comparison, stay local. The local `canonicalFilterValue` is deleted.

## (b) One reconstruction path

Module level, next to `formatFacetToken` (L1656):

- `serializeQuery(clauses) -> string`. Atoms: `atom.raw` if present, otherwise `formatAtom`. Forms: `plain` joins with ` OR `, `paren` gives `(` ... ` OR ` ... `)`, `merged` joins with a space. Clauses join with a space. Replaces `serializeGroups`.
- `editQuery(query, edit) -> string` = `serializeQuery(normalizeClauses(apply(parseFilterQuery(query).groups, edit)))`.

| Edit | Effect | Used by |
|---|---|---|
| `{type:'add', key, val}` | No-op if present (same key incl. polarity, canon val). Otherwise append a new `plain` clause; normalize merges concept/model | facet tick, free-value input, `addFacetToken` |
| `{type:'remove', key, val}` | Remove matching atoms everywhere | facet untick, operator pill × |
| `{type:'toggle', key, val}` | remove if present, else add | `selectRailToken` |
| `{type:'removeAt', clause, atom}` | Remove one atom by position (same parse) | text pill × |
| `{type:'clearKeys', keys}` | Remove atoms whose key, with `!`/`-` stripped, is in `keys` | mClear `['model','file']`, cClear `['concept']`, fClear (field names) |
| `{type:'join', at}` | Concatenate clauses `at-1` and `at` into a `paren` clause | AND→OR connector |
| `{type:'split', clause, at}` | Split a clause into two; halves keep `paren` if their length is over 1 | OR→AND connector |

`normalizeClauses` is shared with the parser:
1. Drop empty clauses.
2. A clause with one atom becomes `plain`.
3. Merge every single-atom `plain` clause holding a positive `concept:` atom into one `merged` clause at the first one's position. Same for `model:`/`file:`. Negated atoms are never merged.

Quoting (`formatAtom` and `formatFacetToken`): a value is quoted when it is empty or matches `/[\s()"']/`, and a text atom also when it is `OR`/`AND`. Double quotes are used unless the value contains `"`, then single quotes. Values containing both quote kinds cannot be represented (see Risks).

Rebuild sites routed through `editQuery`, and their bodies deleted:
1. `toggleFacet` L1073-1106
2. mClear L1159-1175
3. cClear L1251-1267
4. fClear L1447-1464
5. text-pill × L1495-1500
6. join connector L1592-1606
7. split connector L1618-1631
8. `selectRailToken` L6455-6488 (parse the token, then `toggle`; a non-operator token still replaces the query)
9. `addFacetToken` L6492-6499

Not rebuild sites, because they set the whole query: the metamodel click (L5355), Clear filters (L1479), and the search input.

## (c) Parser and single evaluation

`parseFilterQuery` keeps its tokenizer and precedence (OR binds tighter, parentheses delimit one OR clause). It records `form` per clause, calls `normalizeClauses`, and returns `{ groups, operators }`. `operators` is the flat list of operator atoms from `groups`.

```js
// ponytail: flat boolean model by design (console-filter-semantics D3). A query
// is an AND of clauses and a clause is an OR of atoms. Parentheses delimit one
// OR clause and do not nest; AND inside parentheses is ignored; `k:z OR (a b)`
// loses the outer OR. Reopen (expression tree) when someone needs `(a AND b) OR c`.
```

`filterElements` has one path:
```js
if (!parsed.groups.length) return list.slice()
return list.filter(el => isObject(el) && parsed.groups.every(c => c.atoms.some(a => matchAtom(el, a, mctx))))
```
`mctx` is `{draftsById, reviewedMap, hay}`. `hay` is computed lazily once per element. `hasExplicitLogic` and the `modelOps/conceptOps/otherOps` branch are deleted.

| Consumer | After |
|---|---|
| active models/concepts (L1068), `activeFieldCount` (L1336), `isChecked` (L1361), `renderRail` (L1672), `activeGuideConcept` (L1893) | Unchanged: read `operators` |
| pill guard (L1485), `displayGroups` fallback (L1557) | `parsed.groups.length`; the fallback is deleted |
| `addFacetToken` presence (L6495) | Moves into the `add` edit |

## (d) Rail counts per model

In `renderRail`, models branch: build `countsByModel[mid][concept]` once from `state.elements`, keyed `String(e.modelId || e.modelFile)` exactly as `conceptNamesForModel` does. L1795 uses `countsByModel[mid][name] || 0`. The click stays `formatFacetToken('concept', name)`, unscoped (D5). The flat branch keeps `counts`.

## (e) Pill connectors

`displayGroups = parsed.groups`. Between clauses: an AND toggle (`join`). Inside a `plain`/`paren` clause: an OR toggle (`split`). Inside a `merged` clause: an OR toggle whose AND button is `disabled` + `aria-disabled="true"`. Its title says repeated concept/model filters always combine with OR. The shared tooltip is reworded and keeps the "combine with AND" phrase: clauses combine with AND, atoms in a clause with OR, repeated `concept:`/`model:` with OR, `a|b` is any-of. The pill label uses the exact `conceptByName` match only; if nothing matches exactly, the label is the raw value (finding 3). The fuzzy fallback stays only for `activeGuideConcept`.

## (f) Docs

`docs/documentation/content/how-to/domain-console.md` gains a "Filtering" section covering: exact vs free text, the flat model and its limit, and the nn-core/console boundary.

## (g) Tests (STRICT TDD) and regeneration

All in `test/console-rail-filter.test.mjs`. `PUBLIC_API` adds `parseFilterQuery`, `serializeQuery`, `editQuery`, `matchPredicate`.

Red first, one test per finding:
1. `editQuery('status:draft OR status:published', add concept Work)` gives `status:draft OR status:published concept:Work`, and a boot test shows more than 0 cards. Same check for pill ×, each clear button, and a rail click.
2. `field:status=active` excludes `inactive`. `!field:status=active` keeps `inactive`. `field:status` gives presence in both polarities.
3. `concept:task` excludes `Subtask`. `model:plan` excludes `plan_v2`. The pill label for `concept:Concept` is not "Concept 1".
4. Badge parity: render the Fields facet over audit-like values (`TestLab_intake_TestLab`, `reviewed`/`to:reviewed`). For every badge, `filterElements(field:value).length` equals the badge.
5. `a:1 OR b:2 c:3` parses as `[[a,b],[c]]` (documented precedence).
6. `concept:work concept:plan status:x OR status:y` evaluates the concepts as OR and the status clause as OR. The pills between concepts show an active OR with AND disabled.
7. A rail concept under a model shows that model's count. The click query has no `model:` clause.

Then come the seam table tests (`matchPredicate` directly, including NFC `Zoé`, `n/a` comparisons, and an absent value with `not`), and the round-trip property: a fixed corpus plus a seeded PRNG generator (no new dependency) over atom kinds (text, quoted, negated, any-of, numeric, concept, model, file, values with parens/quotes) and forms. The asserts are `shape(parse(serialize(g))) === shape(g)` and idempotence of `serialize∘parse`. `shape` maps each clause to `{form, atoms:[type,key,val]}`.

Existing tests to update:
- L146-149 (`element:ecto`): use the exact `element:ecto-1` and `element:"Ghost Mobile"`.
- L283: unchanged (`join` gives `paren`).
- L34: unchanged (merged form).

After green, regenerate:
- `node scripts/build-console-bundle.mjs`
- `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open` (commit the fixture, per nn-dev-development 2d)
- `node scripts/verify.js`

No `npm ci`.

## (h) Slices 2 and 3

`runQuery` cannot serve the console. It needs file snapshots and a single path, and it returns `@` URIs, while the console filters in-memory elements across models with inherited values and relations. So **slice 2 must extract a pure predicate** and not call `runQuery`. What slice 2 should export, in a new self-contained `iNNfo/packages/nn-core/src/filterPredicate.ts` (no `sourceRef` import, so it can be bundled alone):
- `canonicalFilterValue(value: string): string`
- `matchPredicate(op: 'eq'|'any'|'not', items: readonly string[] | null, arg)`, with absent items true only under `not`
- `queryUnits.ts` imports both

Parity tests:
- nn-core (vitest): for every `(field, value)` in a fixture file, `runQuery` URIs equal the sections where `matchPredicate('eq', items, value)` holds.
- Console (slice 3): `filterElements('field:k=v')` over the committed testlab fixture's JSON slot equals `runQuery` over the testlab model files, compared by element slug.

Slice 3 adds `scripts/export-filter-module.mjs` (copy of `export-address-module.mjs`, entry `filterPredicate.ts`, global `nnFilter`, `--check`), registers `nn-filter.generated.js` in `scripts/lib/console-bundle.js` and `console-bundle.test.js`, swaps the seam body, and deletes the local code.

## File changes (slice 1)

| File | Action |
|---|---|
| `iNNfo/specs/bluepriNNts/console/nn-runtime.js` | Modify: seam, parser, `filterElements`, `serializeQuery`/`editQuery`, 9 sites, rail, pills, exports |
| `test/console-rail-filter.test.mjs` | Modify: new and updated tests |
| `docs/documentation/content/how-to/domain-console.md` | Modify: Filtering section |
| `iNNfo/specs/bluepriNNts/console/nn-console.bundle.js`, `test/fixtures/testlab/domaiNN_console.html` | Regenerate |

## Risks and rollback

- Users who relied on substring facets lose matches. This is intended: free text covers it, and the commit says so.
- Possible merge conflict with `claude/filter-direct-fixes-daeccf` (376a07ce, text-pill re-quoting). `editQuery` supersedes that hunk. Rebase slice 1 after it lands, or drop the hunk.
- Values containing both `"` and `'` cannot be represented in the grammar. Facet ticks for such values are skipped. Rare; documented.
- Spec scenario "Click is not model-scoped" shows `concept:Concept 1`. The actual token is `concept:"Concept 1"`. The spec text needs that quoting.
- nn-core may not ship slice 2 with these semantics (absent value under `not`). The handoff states them, and the parity test enforces them.

Rollback: revert the slice-1 commits on `dev`, then regenerate the bundle and testlab fixture from the reverted sources. Nothing is persisted or published.

## Open Questions

- [ ] Slice 2 module name and ownership (`filterPredicate.ts`) need confirmation from the imports session.
