# Delta for video-blueprint

Scope: the `video-script` blueprint's `Video` concept gains an optional `template` reference field.

## ADDED Requirements

### Requirement: Video-Level Template Field

The `video-script` blueprint MUST define an optional `template` Field on the `Video` concept, of
type `reference` targeting the `Template` concept, so a whole video can declare its default
Template instance. The field MUST be optional; a script that omits it MUST still validate. When
present, it participates in the Model Selection Cascade.

#### Scenario: Video declares a template

- GIVEN a `video-script` script whose `Video` element declares `template:: [[My Series :: Presenter Full]]`
- WHEN the script is validated
- THEN it validates with no schema errors
- AND the reference resolves to the named Template instance

#### Scenario: Absent video template still validates

- GIVEN a script whose `Video` element omits `template::`
- WHEN the script is validated
- THEN it validates with no schema errors
