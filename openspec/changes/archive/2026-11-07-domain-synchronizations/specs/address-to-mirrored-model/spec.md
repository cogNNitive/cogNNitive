# address-to-mirrored-model Delta Spec

## ADDED Requirements

### Requirement: A reference field may target a mirrored model by path

A field of `type:: reference` MUST accept a value of the path form `sources/sync/<alias>/<path>_NN.md@<slug>` (optionally `&field`) that targets an element of a model mirrored under `sources/sync/<alias>/`. The value MUST be parsed by `parseMirrorAddress` and resolved by the workspace reference pass against a per-alias `DomainIndex` built over `sources/sync/<alias>/`. `type:: address` MUST NOT be used for this purpose: it is only shape-checked and never resolved against real targets. There is no short form (`model@slug`); only the path form exists.

#### Scenario: Reference to a mirrored element resolves
- GIVEN a mirror containing `sources/sync/org/organization_NN.md` with an element slug `gerente`
- AND a consumer field `responsable :: reference` with value `sources/sync/org/organization_NN.md@gerente`
- WHEN the consumer is validated
- THEN no error is reported for the field

#### Scenario: Missing element is an error
- GIVEN the same field with value `sources/sync/org/organization_NN.md@no-such-slug`
- WHEN the consumer is validated
- THEN a `REF_ELEMENT_NOT_FOUND` error names the field

#### Scenario: Missing mirror model or alias is an error
- GIVEN the same field with an alias folder or model file that does not exist under `sources/sync/`
- WHEN the consumer is validated
- THEN a `REF_MODEL_NOT_FOUND` error names the field

#### Scenario: Concept mismatch is a warning
- GIVEN the field declares `target_concepts` and the mirrored element has another concept
- WHEN the consumer is validated
- THEN a `REF_CONCEPT_MISMATCH` warning names the field

#### Scenario: Per-file validation stays silent
- GIVEN a consumer model holding a mirror reference
- WHEN only the per-file reference pass runs
- THEN the mirror reference is passed on to the workspace pass and no `ADDRESS_MALFORMED` is reported

### Requirement: Mirror targets resolve from the mirror alone

Validation and reading of references that target mirrored models MUST work from the mirror files alone, without reading the origin.

#### Scenario: Resolution works offline
- GIVEN a mirror and an unreachable origin
- WHEN the consumer is validated
- THEN references into the mirror resolve
