# Delta for model-mutation-references

Living spec read: `openspec/specs/model-mutation-references/spec.md`. The first requirement (a version bump never renames a model, so references stay valid) is unchanged and not repeated. The second requirement changes in one place only: the cross-model element link is no longer a title-qualified link but a unified-grammar address. Slug-first resolution of intra-model wikilinks, with the existing name fallbacks and `AMBIGUOUS_ELEMENT_NAME`, is not title resolution across models and is unchanged.

## MODIFIED Requirements

### Requirement: Slug-First Structural and Wikilink Reference Resolution

Structural references (such as schema reference fields, matrix row headers and matrix column headers) MUST be written using immutable element and concept slugs. Cross-model element links MUST be written as unified-grammar addresses (`<hierarchical-id>@<slug>`, see `unified-reference-grammar`); a cross-model link MUST NOT be resolved by title. When resolving wikilinks (`[[target]]`) and reference fields against elements in the model graph, the validator and reference resolver (`references.ts`) MUST apply the following precedence order within the model that holds the link:

1. **Exact Slug Match**: Target matches `element.slug`.
2. **Exact Name Match**: Target matches `element.name` (legacy fallback).
3. **Normalized Name Match**: Target matches normalized `element.name` with separator tolerance (legacy fallback).

When an exact slug match exists, the resolver MUST bind to that element immediately. If a target does not match any slug but matches an element display name, it MUST bind to that element using name fallback. If a display name matches multiple elements defined under distinct concepts within the same model, the resolver MUST emit an `AMBIGUOUS_ELEMENT_NAME` diagnostic and MUST NOT arbitrarily bind to one element.
(Previously: cross-model element links were listed without a grammar and were written as title-qualified links elsewhere.)

#### Scenario: Wikilink resolves directly to element slug
- GIVEN an element with display name `Operating Margin` and `slug:: op-margin`
- AND prose containing `[[op-margin]]`
- WHEN references are resolved
- THEN the wikilink resolves directly to the element via slug match
- AND no legacy fallback is engaged

#### Scenario: Wikilink resolves via legacy name fallback
- GIVEN an element with display name `Customer Acquisition Cost` and `slug:: cac`
- AND prose containing `[[Customer Acquisition Cost]]`
- WHEN references are resolved
- THEN the wikilink resolves to the element via exact name match fallback

#### Scenario: Ambiguous display name emits diagnostic
- GIVEN two elements in different concepts sharing display name `Priority`
- AND prose containing `[[Priority]]`
- WHEN references are resolved
- THEN the resolver emits an `AMBIGUOUS_ELEMENT_NAME` diagnostic
- AND the link is flagged as ambiguous

#### Scenario: Matrix headers reference element slugs
- GIVEN a matrix definition in a model
- WHEN matrix row and column headers are specified
- THEN the headers use element slugs for row and column identities

#### Scenario: Cross-model element link is an address
- GIVEN an element in `villabotijos-today/pepper-mapache` linking to the Scene of another Video
- WHEN the link is written
- THEN it reads `villabotijos-today/intro@00-gancho`
- AND it is not resolved through the title of the target model
