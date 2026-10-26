# Delta for innfo-console-runtime

Scope: slice 1 only (console). Slices 2 and 3 are listed under "Deferred" at the end and carry no requirements here.

## MODIFIED Requirements

### Requirement: Field Facet Matching

The filter MUST support `<field>:<value>` for any declared Field, generalising the existing generic field filter. Facet, field, concept and model matching MUST be exact equality after normalization (Unicode NFC, trim, case-fold), for scalar and multi-valued values alike; for a multi-valued Field (or any array value) the match MUST be exact membership in the element's effective values (own plus inherited). Substring matching MUST NOT be used for any facet, field, concept or model match; it applies only to free-text search. Numeric comparators (`>`, `>=`, `<`, `<=`) are unchanged. Repeated `<field>:<value>` tokens, for the same or different fields, MUST combine with AND. Any-of is written with `|` inside one token, `<field>:a|b`, and matches an element carrying at least one of the listed values; each such token is one OR group. Every token and every other facet MUST combine with AND, except that repeated `concept:` tokens, and repeated `model:` tokens, are merged into one OR clause each (see "Single Filter Evaluation Mode"). The asymmetry MUST be stated on the AND/OR connector's tooltip (`title`), not as visible filter-bar text. No dedicated `tag:` or `tag-any:` branch or alias remains. A facet rail or add-facet menu MUST list each `select` Field's values through a TWO-STEP facet: first the Field NAME, then, only after a Field is chosen, its values, drawing on the declared `options` vocabulary when the Field declares one and falling back to the observed values otherwise. No value MUST be listed before its Field is chosen. The AND/OR connector between clauses MUST be a segmented control (`.nn-op-toggle` with `.nn-op-btn` buttons and `role="group"`), not a native `<select>`, and activating the opposite option MUST rewrite the active query.
(Previously: scalar non-select fields, `concept:`, `model:` and `field:k=v` matched by substring; the any-of/negation text did not state exact equality; model/concept OR semantics applied only when the query had no OR or parenthesis.)

#### Scenario: Values narrow with AND
- GIVEN elements A `tags: [ai, pricing]` and B `tags: [ai]`
- WHEN the filter is `tags:ai tags:pricing`
- THEN only A is listed

#### Scenario: Exact membership, not substring
- GIVEN an element with `tags: [retail]`
- WHEN the filter is `tags:ai`
- THEN it is not listed

#### Scenario: Any-of widens with OR
- GIVEN elements A `tags: [ai]`, B `tags: [pricing]`, C `tags: [ops]`
- WHEN the filter is `tags:ai|pricing`
- THEN A and B are listed and C is not

#### Scenario: Mixed AND and any-of
- GIVEN elements A `tags: [core, ai]`, B `tags: [core, pricing]`, C `tags: [ai]`
- WHEN the filter is `tags:core tags:ai|pricing`
- THEN A and B are listed and C is not

#### Scenario: Works for any multi-valued field
- GIVEN a multi-valued Field `labels` and elements A `labels: [x, y]` and B `labels: [y]`
- WHEN the filter is `labels:x`
- THEN only A is listed

#### Scenario: Inherited values match
- GIVEN an element with no own `tags` whose concept carries `tags:: [core]`
- WHEN the filter is `tags:core`
- THEN the element is listed

#### Scenario: A field named tags is a facet source
- GIVEN an element whose Field `tags` is `[ai]`
- WHEN the filter is `tags:ai`
- THEN it is listed (reverses the former "not a tag source" rule)

#### Scenario: Legacy token is not special
- GIVEN the filter `tag:ai`
- WHEN it is evaluated
- THEN it is treated as the generic filter on a Field named `tag`, with no tag-specific branch
- AND `tag-any:ai` likewise has no special meaning

#### Scenario: Scalar field equality is exact
- GIVEN elements A `status: active` and B `status: inactive`
- WHEN the filter is `field:status=active`
- THEN only A is listed

#### Scenario: Concept equality is exact
- GIVEN elements of concepts `Task` and `Subtask`
- WHEN the filter is `concept:task`
- THEN only `Task` elements are listed

#### Scenario: Model equality is exact
- GIVEN elements of models `plan` and `plan_v2`
- WHEN the filter is `model:plan`
- THEN only `plan` elements are listed

#### Scenario: Normalization is NFC, trim and case-fold
- GIVEN an element with `owner: Zoé ` (decomposed accent, trailing space)
- WHEN the filter is `owner:"ZOÉ"` (precomposed)
- THEN the element is listed

#### Scenario: Facet badge counts equal result counts
- GIVEN any value shown with a count in a facet checkbox list
- WHEN that value is ticked alone
- THEN the number of listed elements equals the badge count

#### Scenario: Negation excludes only exact matches
- GIVEN elements A `status: active` and B `status: inactive`
- WHEN the filter is `!field:status=active`
- THEN B is listed and A is not

#### Scenario: Free text stays substring
- GIVEN an element named `Subtask`
- WHEN the filter is the bare text `task`
- THEN the element is listed

## ADDED Requirements

### Requirement: Predicate Seam For Deterministic Operators

All per-atom value predicates (exact equality, local any-of `a|b`, negation via `!` or `-`, numeric comparisons) MUST be evaluated through one function, `matchPredicate(op, value, arg)`. The seam MUST have no knowledge of query syntax or UI. `matchAtom` MUST NOT contain inline equality, any-of, negation or comparison logic outside it.

#### Scenario: Any-of through the seam
- GIVEN `status: draft` on A and `status: published` on B
- WHEN the filter is `status:draft|published`
- THEN A and B are listed

#### Scenario: Negation of a missing field
- GIVEN an element with no `status` field
- WHEN the filter is `!status:active`
- THEN the element is listed

#### Scenario: Presence-less field filter does not match everything
- GIVEN the filter `field:status` (no `=` and no value)
- WHEN it is evaluated, with or without negation
- THEN it MUST NOT silently list every element; it is ignored as an incomplete atom or matches by presence, consistently in both polarities

#### Scenario: Numeric comparison unparseable
- GIVEN an element with `score: n/a`
- WHEN the filter is `score:>=3`
- THEN the element is not listed

### Requirement: Single Filter Evaluation Mode

Query evaluation MUST use one mode regardless of whether the query contains OR or parentheses. At parse time, repeated `concept:` tokens MUST merge into one OR clause and repeated `model:` tokens into one OR clause; every other key MUST stay a separate AND clause, so `tags:core tags:ai` remains AND. Adding an explicit OR or parenthesis MUST NOT change how unrelated facets combine. Filter pills MUST show the connector the engine applies: OR between merged concept pills (or model pills), AND elsewhere. `filterElements` MUST evaluate a single clause list.

#### Scenario: Repeated concepts are OR
- GIVEN elements of concepts Work, Plan and Note
- WHEN the filter is `concept:work concept:plan`
- THEN Work and Plan elements are listed
- AND the two pills are joined by OR

#### Scenario: OR does not flip other facets
- GIVEN elements with `status` and `tags`
- WHEN the filter is `status:draft OR status:published tags:core tags:ai`
- THEN `tags:core` and `tags:ai` combine with AND, and the status clause is an OR clause

#### Scenario: Tags contract unchanged
- GIVEN A `tags: [core, ai]` and B `tags: [core]`
- WHEN the filter is `tags:core tags:ai`
- THEN only A is listed

### Requirement: Query Preservation Across UI Actions

Facet toggles, filter-pill removal, facet "clear" buttons, text-pill removal and rail clicks MUST all rebuild the query through ONE reconstruction function that serializes the parsed clauses, preserving OR and parenthesis structure and every untouched clause. Only the targeted token MAY change. Round-trip: for any parsed query, `parse(serialize(groups))` MUST equal `groups`.

#### Scenario: Tick a concept under an OR query
- GIVEN the filter `status:draft OR status:published`
- WHEN the user ticks concept Work
- THEN the query is `status:draft OR status:published concept:Work`
- AND the results are the draft-or-published Work elements, not zero

#### Scenario: Remove a pill from a grouped query
- GIVEN the filter `(a:1 OR b:2) c:3`
- WHEN the user removes the `c:3` pill
- THEN the query is `(a:1 OR b:2)`

#### Scenario: Rail click keeps existing clauses
- GIVEN the filter `status:draft OR status:published`
- WHEN the user clicks a rail token
- THEN the original OR clause is still present in the resulting query

#### Scenario: Round trip
- GIVEN each query in a fixed corpus (plain, OR, parenthesized, negated, quoted, any-of, merged concepts)
- WHEN parsed, serialized and parsed again
- THEN the two group lists are equal

### Requirement: Documented Boolean Limits

The filter is a flat boolean model: an AND of clauses, each clause an OR of atoms. Nested parentheses and AND inside a parenthesis are NOT supported and MUST be documented as a limit, with a code comment (`ponytail:`) stating when to reopen it (someone needs `(a AND b) OR c`). OR binds tighter than implicit AND.

#### Scenario: Precedence is documented behavior
- GIVEN the filter `a:1 OR b:2 c:3`
- WHEN it is parsed
- THEN the clauses are `[a:1, b:2]` and `[c:3]`

#### Scenario: Nesting is unsupported, not silently reinterpreted wrongly
- GIVEN the filter `k:z OR (a:1 b:2)`
- WHEN the limit applies
- THEN the behavior matches the documented flat rule and the limit is stated in the console docs

### Requirement: Rail Concept Counts Are Per Model

A concept listed under a model in the rail MUST show the number of that model's elements of that concept, not the global concept count. Clicking such a concept MAY remain unscoped by model; model-scoped concept filtering is deferred until the hierarchical address grammar ships, and no interim `model:`+`concept:` pair or `scope:` syntax MUST be introduced.

#### Scenario: Concept 1 under Intake
- GIVEN the testlab fixture, where Concept 1 has 3 elements in coverage and 1 in intake
- WHEN the rail renders the Concept 1 entry under Intake
- THEN its count is 1

#### Scenario: Click is not model-scoped
- GIVEN the same rail
- WHEN the user clicks Concept 1 under Intake
- THEN the filter is `concept:"Concept 1"` (quoted because of the space) with no model clause

### Requirement: Deterministic Filtering Boundary

Deterministic value filtering (exact equality, any-of, negation) belongs to nn-core semantics; the console MUST implement it locally only behind the predicate seam until nn-core exposes it. Search ergonomics stay in the console: free-text search, the AND/OR toggle, numeric comparisons, and UI-state facets (`is:draft|reviewed|changed`, `has:`). The console MUST NOT define its own operator syntax beyond this. This boundary MUST be written in the console documentation.

#### Scenario: Console-local facets
- GIVEN the filter `is:draft`
- WHEN it is evaluated
- THEN it uses draft state held by the console, not nn-core

#### Scenario: Boundary documented
- GIVEN the console documentation
- WHEN it is read
- THEN it states that deterministic filtering lives in nn-core and search ergonomics live in the console

## Deferred (no requirements in this change)

- Slice 2: nn-core exports a pure equality predicate and `op.` any-of/negation, with a parity test against `query_units`; owned by the session that owns `queryUnits.ts`.
- Slice 3: point the seam at a generated nn-core browser module and delete the local any-of and negation.
