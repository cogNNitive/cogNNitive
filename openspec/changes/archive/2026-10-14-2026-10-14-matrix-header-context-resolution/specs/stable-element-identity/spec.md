# Delta for stable-element-identity

## MODIFIED Requirements

### Requirement: Diagnostics for Unfrozen Models and Ambiguous Names

The validator MUST emit the following diagnostics:
1. `UNFROZEN_MODEL`: Emitted with severity `warning` for any Level-3 model containing elements without explicit `slug::` declarations. Unfrozen models remain valid for reading and evaluation, but tools MUST warn that mutation requires freezing.
2. `AMBIGUOUS_ELEMENT_NAME`: Emitted whenever a reference or wikilink resolves to an element by display name and more than one element of the model has that exact display name. For a reference-typed element field or a `[[…]]` wikilink the severity is `error` (the author MUST qualify the reference or use the element's unique slug). For a matrix cell row or column header the severity is `warning` and it is never blocking.

A reference, wikilink or matrix header MUST resolve by exact slug first, then by exact display name (both are iNNfo grammar). No other matching — separator-normalized, case-folded beyond the existing case-insensitive comparison, or fuzzy — MAY be applied; a value matching neither is unresolved. When a matrix cell row or column header matches more than one element by display name, the resolver MUST narrow the candidates by the containing matrix's declared `source` concept (for a row header) or `target` concept (for a column header), compared case-insensitively against each candidate element's owning concept: if exactly one candidate belongs to that concept, the header is resolved and no `AMBIGUOUS_ELEMENT_NAME` diagnostic is emitted for it. When the axis label is absent, empty, or does not narrow the match to exactly one element, the matrix header diagnostic is emitted with severity `warning` and remains non-blocking. This context step applies only to matrix headers; a reference-typed field or a `[[…]]` wikilink keeps severity `error` and MUST NOT use matrix context.

(Previously: matrix headers resolved by exact slug or exact display name only, and any matrix-header name-match of more than one element was an advisory `warning` regardless of the matrix's declared axes.)

#### Scenario: Unfrozen model emits UNFROZEN_MODEL warning
- GIVEN a Level-3 model containing elements without `slug::` declarations
- WHEN knowledge validation runs
- THEN a diagnostic with code `UNFROZEN_MODEL` and severity `warning` is emitted
- AND the model is marked readable

#### Scenario: Resolving ambiguous element name emits AMBIGUOUS_ELEMENT_NAME
- GIVEN two elements in different concepts named `Total Revenue`
- AND a reference or wikilink `[[Total Revenue]]`
- WHEN references are resolved
- THEN a diagnostic with code `AMBIGUOUS_ELEMENT_NAME` and severity `error` is emitted
- AND the resolver does not arbitrarily select one element

#### Scenario: A matrix header resolves via its declared axis concept
- GIVEN an element `Public Relations` under concept `Activities`
- AND an element `Public Relations` under concept `Communication`
- AND a matrix declaring `source: Activities` whose row header is `Public Relations`
- WHEN references are resolved
- THEN the row header resolves to `Activities`/`Public Relations`
- AND no `AMBIGUOUS_ELEMENT_NAME` diagnostic is emitted for that row

#### Scenario: A matrix header without a disambiguating axis stays an advisory warning
- GIVEN an element `Public Relations` under concept `Activities`
- AND an element `Public Relations` under concept `Communication`
- AND a matrix whose declared `source` concept contains no element named `Public Relations` (or whose axis label is empty) and whose row header is `Public Relations`
- WHEN references are resolved
- THEN a diagnostic with code `AMBIGUOUS_ELEMENT_NAME` and severity `warning` is emitted
- AND the model still validates because the matrix diagnostic is advisory, never blocking

#### Scenario: No separator-normalized match
- GIVEN an element named `Element 2A` with slug `element-2a`
- WHEN a reference `[[Element_2A]]` is resolved
- THEN it is unresolved
- AND `[[Element 2A]]` and `[[element-2a]]` both resolve to the element
