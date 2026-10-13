# Delta for stable-element-identity

## MODIFIED Requirements

### Requirement: Diagnostics for Unfrozen Models and Ambiguous Names

The validator MUST emit the following diagnostics:
1. `UNFROZEN_MODEL`: Emitted with severity `warning` for any Level-3 model containing elements without explicit `slug::` declarations. Unfrozen models remain valid for reading and evaluation, but tools MUST warn that mutation requires freezing.
2. `AMBIGUOUS_ELEMENT_NAME`: Emitted with severity `error` whenever a reference, wikilink or matrix header references an element by display name and more than one element of the model has that exact display name.

A reference, wikilink or matrix header MUST resolve by exact slug first, then by exact display name (both are iNNfo grammar). No other matching — separator-normalized, case-folded beyond the existing case-insensitive comparison, or fuzzy — MAY be applied; a value matching neither is unresolved. (Previously: `AMBIGUOUS_ELEMENT_NAME` could be a warning, and a separator-normalized name match was applied as a ledgered legacy fallback.)

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

#### Scenario: No separator-normalized match
- GIVEN an element named `Element 2A` with slug `element-2a`
- WHEN a reference `[[Element_2A]]` is resolved
- THEN it is unresolved
- AND `[[Element 2A]]` and `[[element-2a]]` both resolve to the element
