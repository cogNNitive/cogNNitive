# Spec: Model Validation Warnings - Concept Documentation Validation

## Purpose
Enforce metamodel documentation completeness by warning during level-3 model validation when concepts defined in the level-2 parent template are not fully documented in the template's markdown content.

## Requirements

### Requirement: R-MVW-01: Undocumented Concept Warning
During model validation, the validator MUST parse the raw content of the level-2 template spec. If any concept declared in the template's frontmatter lacks a corresponding H2 heading (`## Concept Name`) in the template's markdown, the validator MUST emit a validation warning.

#### Scenario: Concept defined but lacks heading in template spec
- GIVEN a template spec that defines concept "Market" in its frontmatter
- AND the template spec's raw content does not contain a "## Market" heading
- WHEN the model is validated
- THEN the validation report MUST include a warning: "Concept 'Market' is undocumented in parent template"

### Requirement: R-MVW-02: Incomplete Guidance Section Warning
For each concept defined in the level-2 template spec, the template's markdown MUST contain H3 sub-headings for "Summary", "Description", "Methodologies", and "Prompts". If any of these are missing, the validator MUST emit a validation warning.

#### Scenario: Concept lacks required H3 sub-sections in template spec
- GIVEN a template spec with a concept "Market" and heading "## Market"
- AND the "## Market" section lacks a "### Methodologies" sub-heading
- WHEN the model is validated
- THEN the validation report MUST include a warning: "Concept 'Market' has incomplete documentation in parent template"
