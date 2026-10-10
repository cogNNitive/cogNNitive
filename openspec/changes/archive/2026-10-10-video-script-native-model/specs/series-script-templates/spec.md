# Delta for series-script-templates

## ADDED Requirements

### Requirement: Series Is a Blueprint Plus L3 Template Data

A Series MUST be modeled as a blueprint (schema) plus an L3 Template-data document that ships its `Template` instances (tool, voice, and model configuration). A script MUST reference a Template instance through a `template::` reference field.

#### Scenario: Series ships its template data

- GIVEN a Series
- WHEN it is modeled
- THEN it has a blueprint defining its schema
- AND it has an L3 Template-data document declaring its Template instances

#### Scenario: Script references a series template

- GIVEN a script in a Series and a Template instance in that Series' L3 Template-data document
- WHEN the script references it via `template::`
- THEN the reference resolves to the Template instance

## MODIFIED Requirements

### Requirement: Series-Wide Rules Document

A Series MUST hold its series-wide rules (tone, sound tags) in the Series blueprint and its L3 Template-data document. Per-element instructions MUST NOT duplicate series-wide rules.
(Previously: exactly one separate rules document, with `{{slot}}` fill-in instructions.)

#### Scenario: Tone rule lives once

- GIVEN a Series declaring its tone rule in the Series blueprint
- WHEN a new video is authored in that series
- THEN the tone rule is read from the Series blueprint, not restated per element

## REMOVED Requirements

### Requirement: `{{slot}}` Placeholder Convention

(Reason: author-fillable content is now modeled as native blueprint Fields instead of `{{slot}}` text markers.)
(Migration: replace slots with the corresponding blueprint Fields.)

### Requirement: Inline Fill-In Instructions Per Slot

(Reason: fill-in guidance now comes from the blueprint's Field definitions, not adjacent HTML comments.)
(Migration: move per-field guidance into the blueprint Field definitions.)

### Requirement: Zero-Unresolved-Placeholder Gate

(Reason: with no `{{...}}` convention, the gate is replaced by L3 blueprint validation, which rejects undefined or empty required Fields.)
(Migration: rely on `video-script` blueprint validation before engine compile.)
