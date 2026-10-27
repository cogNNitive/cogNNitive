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

### Requirement: Series, Domain And Episode Extension Folders

A series folder MAY contain one `series_NN.md` (the `series` cascade level); the domain root MUST NOT be treated as a series. The domain root MAY contain one `video-defaults_NN.md` (the `domain` level). The episode, series and domain folders MAY each contain `components/<name>.html`, `sounds/<name>.*` and `frames/<name>.md`, where `<name>` is a cascade value, never an event or slot convention. File lookup MUST be episode, then series, then domain, then the skill fallback, by a nearest-folder walk from the script's folder; a nearer file MUST win. All folders and documents are optional. No scaffolder creates them: the domain Video Defaults is a copy of the package's `defaults/video-defaults_NN.md` made on adoption (SKILL.md step), and a new series writes its own `series_NN.md`.

#### Scenario: Episode file beats series file

- GIVEN `components/title.html` in both the episode and the series folder
- WHEN the `title` component name is located
- THEN the episode file is used

#### Scenario: Domain file is shared by every series

- GIVEN `sounds/whoosh.mp3` only at the domain root and two series without `sounds/`
- WHEN either series resolves `scene-boundary=whoosh`
- THEN the domain file is used

#### Scenario: No override falls back

- GIVEN no `components/title.html` at episode, series or domain level
- WHEN the `title` component is located
- THEN the skill's neutral fallback is used

#### Scenario: Folders are optional

- GIVEN a domain with no `video-defaults_NN.md` and a series with no `series_NN.md`, `components/`, `sounds/` or `frames/`
- WHEN a video in it is rendered
- THEN rendering succeeds using the package defaults and the skill fallbacks

