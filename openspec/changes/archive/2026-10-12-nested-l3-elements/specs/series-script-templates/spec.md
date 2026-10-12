# Delta for series-script-templates

## ADDED Requirements

### Requirement: Script Templates Mandate Nested Layer Syntax

Series script templates and authoring procedures MUST declare `Layer` elements as nested `### NN Layer:` headings inside enclosing `## NN Scene:` sections.

#### Scenario: Script template uses nested headings

- GIVEN a series script template or procedure
- WHEN authoring video scripts
- THEN Scene sections contain nested `### NN Layer:` headings instead of flat `## NN Layer:` sections
