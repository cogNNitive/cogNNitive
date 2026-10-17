# Delta for Template Includes Collision Resolution

## ADDED Requirements

### Requirement: Star and Multi-Concept Fields in Composition

When composing `includes`, a Field with `concept:: *` or a concept list MUST be expanded after composition, over the concepts of the effective composite schema. Identical star Fields declared by several included bluepriNNts (compared by canonical form) MUST deduplicate without `COMPOSITION_COLLISION`. Star Fields that differ in definition (for example one open and one closed `tags` Field) MUST still raise `COMPOSITION_COLLISION` unless `alias` resolves it; there is no union-of-`options` merge rule, and a closed vocabulary that has to coexist uses its own Field name. A concept-specific or list Field beats a `*` Field of the same name silently. There is no Marker deduplication: Marker Definitions are not composed.

#### Scenario: Identical star Fields dedupe
- GIVEN included bluepriNNts `analysis` and `organization`, each declaring the same open `tags` Field with `concept:: *`
- WHEN the composite resolves
- THEN every concept has exactly one `tags` Field and no collision is raised

#### Scenario: Conflicting star Fields collide
- GIVEN one included bluepriNNt declaring open `tags` and another declaring `tags` with `options`
- WHEN the composite resolves without an alias
- THEN `COMPOSITION_COLLISION` names the Field

#### Scenario: Star covers included concepts
- GIVEN a composite whose own `tags` Field uses `concept:: *`
- WHEN it resolves
- THEN concepts contributed by included bluepriNNts carry `tags`

#### Scenario: Marker Definitions are not merged
- GIVEN an included bluepriNNt that still declares a Marker Definition
- WHEN the composite is validated
- THEN `MARKERS_REMOVED` is reported and no marker is composed
