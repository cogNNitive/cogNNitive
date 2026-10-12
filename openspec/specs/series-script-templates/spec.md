# Series Script Templates Specification

## Purpose

Defines how a Series is modeled as a blueprint (schema) plus an L3 Template-data document that ships its `Template` instances, where series-wide rules (tone, sound tags) live, and how a script references a Template instance through the `template::` reference field.

## Requirements

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

### Requirement: Series-Wide Rules Document

A Series MUST hold its series-wide rules (tone, sound tags) in the Series blueprint and its L3 Template-data document. Per-element instructions MUST NOT duplicate series-wide rules.
(Previously: exactly one separate rules document, with `{{slot}}` fill-in instructions.)

#### Scenario: Tone rule lives once

- GIVEN a Series declaring its tone rule in the Series blueprint
- WHEN a new video is authored in that series
- THEN the tone rule is read from the Series blueprint, not restated per element

### Requirement: Script Templates Mandate Nested Layer Syntax

Series script templates and authoring procedures MUST declare `Layer` elements as nested `### NN Layer:` headings inside enclosing `## NN Scene:` sections.

#### Scenario: Script template uses nested headings

- GIVEN a series script template or procedure
- WHEN authoring video scripts
- THEN Scene sections contain nested `### NN Layer:` headings instead of flat `## NN Layer:` sections
