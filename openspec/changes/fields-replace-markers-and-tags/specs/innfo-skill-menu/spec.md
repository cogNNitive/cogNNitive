# Delta for iNNfo Skill Menu

## MODIFIED Requirements

### Requirement: Documentation Consultation Routing
Selecting option `[w]` MUST provide direct access to iNNfo specifications, primitives (Concept, Field, Matrix), matrices, fields (including tags and widgets), and authoring guidelines without modifying workspace files. It MUST NOT present markers as a topic other than the `MARKERS_REMOVED` migration recipe.
(Previously: the categories included markers.)

#### Scenario: Consulting documentation
- **GIVEN** a user selects option `[w]`
- **WHEN** `nn-innfo` processes the request
- **THEN** it presents available documentation categories (Level 1/2 specs, primitives, matrices, fields and tags, and guidelines)
- **AND** performs zero filesystem mutations in the workspace

#### Scenario: No marker authoring offered
- **GIVEN** the model-creation wizard
- **WHEN** it asks which values elements carry
- **THEN** it offers Fields and tags and never asks about Marker Definitions
