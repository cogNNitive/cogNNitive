# Delta for Innfo Console Runtime

## MODIFIED Requirements

### Requirement: Concept Guidance Panel

The runtime MUST provide a right-hand concept guide (`#innfo-concept-guide`) that
appears when a single concept is in focus (a `concept:` filter) and shows the
concept's description, field schema (including each field's widget and whether it is multi-valued), concept-level field values, associated matrices and element
count; it MUST be removed when no single concept is in focus. It MUST NOT show a Markers section.
(Previously: the guide listed the concept's markers.)

#### Scenario: Concept in focus
- GIVEN a `concept:Fleet` filter and a Fleet concept with a description
- WHEN the explorer refreshes
- THEN `#innfo-concept-guide` renders the description, fields, matrices and element count

#### Scenario: Concept-level values shown
- GIVEN a concept with `tags:: [core]`
- WHEN it is in focus
- THEN the guide lists `tags` with `core`

#### Scenario: No markers section
- GIVEN any concept in focus
- THEN the guide contains no "Markers" section

#### Scenario: Focus cleared
- GIVEN the guide is shown
- WHEN the concept filter is cleared
- THEN `#innfo-concept-guide` is removed

## REMOVED Requirements

### Requirement: Tag Facet Matching

(Reason: `tag:` and `tag-any:` were dedicated branches reading a derived `element.tags`. They are deleted with no alias, replaced by the generic field facet, and the scenario "A field named tags is not a tag source" is reversed: a Field named `tags` is now an ordinary facet source.)
(Migration: "Field Facet Matching" below; `tag:x` becomes `tags:x`, and `tag-any:a tag-any:b` becomes `tags:a|b`.)

## ADDED Requirements

### Requirement: Field Facet Matching

The filter MUST support `<field>:<value>` for any declared Field, generalising the existing generic field filter. For a multi-valued Field (or any array value) the match MUST be exact, case-insensitive membership in the element's effective values (own plus inherited); substring matching MUST NOT be used for array membership. Matching MUST be type-aware: an array value uses exact `valueKey` membership, a scalar `select` uses exact case-insensitive equality, and other types use substring; numeric comparators are unchanged. Repeated `<field>:<value>` tokens, for the same or different fields, MUST combine with AND. Any-of is written with `|` inside one token, `<field>:a|b`, and matches an element carrying at least one of the listed values; each such token is one OR group. Every token and every other facet MUST combine with AND. Scalar Fields keep the existing generic matching. Model and concept facets keep their OR semantics; the asymmetry MUST be stated in the filter help text or documentation. No dedicated `tag:` or `tag-any:` branch or alias remains. A facet rail or add-facet menu MUST list each `select` Field's values. (Previously: tag facet matching; see the removed requirement.)

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
