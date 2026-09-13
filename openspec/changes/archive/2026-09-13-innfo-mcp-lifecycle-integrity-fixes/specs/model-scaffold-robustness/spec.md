# Delta for Model Scaffold Robustness

## ADDED Requirements

### Requirement: Scaffold Validity by Construction

The scaffold generator MUST produce content that validates cleanly against its own resolved template on the first attempt. For a `type:: reference` field with no concrete target available at scaffold time, the generator MUST omit the placeholder rather than emit an unsatisfiable dangling wikilink. For a `type:: text` concept that requires element markers, the generator MUST emit at least one `## NN Concept: Element` marker per such concept.

#### Scenario: Reference field with no target omits placeholder

- GIVEN a template field of `type:: reference` with no concrete target resolvable at scaffold time
- WHEN the scaffold body is generated
- THEN the field's placeholder value is omitted rather than emitting `[[Target Element]]`

#### Scenario: Markered concept receives a real element marker

- GIVEN a template concept of `type:: text` that requires element markers
- WHEN the scaffold body is generated
- THEN the concept includes at least one `## NN Concept: Element` marker

#### Scenario: business and blank templates scaffold clean on first attempt

- GIVEN the `business` or `blank` template
- WHEN `init_model` scaffolds a new document
- THEN the generated content validates against its own template with no "No NN element markers found" diagnostic

### Requirement: Failed Init Never Returns a Success-Shaped Payload

When `initModel()`'s pre-write validation fails, the tool response MUST NOT include `filePath` or `content` fields, and `success` MUST be `false`. A caller MUST be able to distinguish "persisted" from "not persisted" by response shape alone, without relying solely on the `success` flag.

#### Scenario: Validation failure omits filePath and content

- GIVEN scaffold validation fails before the write
- WHEN `initModel()` returns
- THEN the response has `success: false` and no `filePath` or `content` field

#### Scenario: Successful init returns filePath and content

- GIVEN scaffold validation passes and the file is written
- WHEN `initModel()` returns
- THEN the response has `success: true`, `filePath`, and `content`
