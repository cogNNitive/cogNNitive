## ADDED Requirements

### Requirement: `type:: knowledge` is canonical and `type:: model` is a retired identifier

`iNNfo/specs/vocabulary.json` and the generated `docs/innfo/documentation/vocabulary.md` MUST declare `type:: knowledge` as the canonical submodel-reference type and MUST record `type:: model` as a retired identifier, following the explicit, published, non-silent pattern established for the retired `Marker` primitive. A `model` declaration MUST remain resolvable as a temporary deprecated alias that normalizes to `knowledge` and MUST emit `FIELD_TYPE_MODEL_DEPRECATED`.

#### Scenario: Canonical entry exists
- GIVEN `iNNfo/specs/vocabulary.json`
- WHEN parsed
- THEN an entry declares `type:: knowledge` as the canonical submodel-reference type

#### Scenario: Retired identifier is recorded
- GIVEN `iNNfo/specs/vocabulary.json`
- WHEN its retired-identifier list is read
- THEN `type:: model` is present, pointing at the `knowledge` canonical term and the `FIELD_TYPE_MODEL_DEPRECATED` diagnostic

#### Scenario: Docs page renders both
- GIVEN the generated vocabulary page
- WHEN read
- THEN it lists `type:: knowledge` as canonical and `type:: model` as retired

#### Scenario: Dictionary and AGENTS blocks agree
- GIVEN the canonical dictionary
- WHEN the vocabulary consistency check runs
- THEN no mismatch is reported
