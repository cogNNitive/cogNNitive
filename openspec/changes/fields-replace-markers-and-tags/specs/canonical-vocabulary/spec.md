# Delta for Canonical Vocabulary

## ADDED Requirements

### Requirement: Marker Retired, Field and Tag Defined

`iNNfo/specs/vocabulary.json` and the generated `docs/innfo/documentation/vocabulary.md` MUST list the L1 primitives as Concept, Field and Matrix, MUST NOT define `Marker Definition` as a live primitive, and MUST define `tag` as a value of the ordinary multi-valued `tags` Field. A `Marker` entry MAY remain only as a retired term pointing to `MARKERS_REMOVED`.

#### Scenario: Three primitives
- GIVEN `vocabulary.json`
- WHEN the L1 primitive entries are read
- THEN exactly Concept, Field and Matrix are live primitives

#### Scenario: Tag defined as a Field value
- GIVEN the vocabulary page
- WHEN the entry for `tag` is read
- THEN it states that a tag is a value of the `tags` Field
