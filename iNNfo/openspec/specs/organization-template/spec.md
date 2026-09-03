# Organization Template

Introduces a Level 2 Organization template and sample model to capture organizational structure separately from processes.

## Requirements

### R-ORG-01: Organization Level 2 Template Schema
The system MUST define the `Organization` template (`organization_NN.md` and versioned equivalent) with:
- Concepts: `Organization` (text), `Position` (list), `Person` (list)
- Markers: `seniority`
- Matrices: `persons-positions` (Person -> Position, mapping assignment via "Occupies")
- Relationships: `hierarchy` and `evaluable_matrix` enabled.

#### Scenario: Validating Organization model
- GIVEN a model referencing parent template `organization_V_0-2-0`
- WHEN it contains an `Organization` text section, `Position` lists, and a `persons-positions` matrix
- THEN the validator MUST parse it successfully with no errors

### R-ORG-02: Organization Sample Model
The system MUST provide a sample organization model `Ghostbusters_V_0-2-0_organization_NN.md` implementing the Organization template.

#### Scenario: Sample model is parsed successfully
- GIVEN the `Ghostbusters` organization sample model
- WHEN loaded and parsed by the core engine
- THEN it MUST validate successfully with the Organization parent template
