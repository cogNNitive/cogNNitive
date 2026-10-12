# Delta for console-export-cli

## ADDED Requirements

### Requirement: Real domain identity and model-qualified element ids

`export-console` MUST derive the domain version from content (a domain hash or the real
aggregate of model versions), never a constant. The draft store key MUST include a
domain identity beyond `basename(root)`. Element ids MUST be qualified by model so two
models with the same element name never collide in `elementsById`.

#### Scenario: Content change moves the version

- GIVEN a domain exported once
- WHEN one model's content changes and the domain is exported again
- THEN the exported `modelVersion` differs and the stale-draft banner can fire

#### Scenario: Same element name in two models

- GIVEN models A and B both define an element `Customer`
- WHEN the console payload is built
- THEN their ids differ and a draft on A's `Customer` never targets B's
