# Spec: Submodel Conformance Validation (Delta)

## MODIFIED Requirements

### Requirement: Target Template Submodel Matching

When a concept field definition declares `target_template` and the referenced submodel file exists, the validator MUST compare `target_template` against the resolved submodel's template identity (`templateName` or `templateUrl`). If the resolved submodel's template does not match `target_template` (by name or stable URL), the validator MUST emit a diagnostic with severity `WARNING`.

#### Scenario: Submodel matches declared target_template by URL
- GIVEN a field definition with `target_template:: https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/procedures/procedures_V_0-1-0_NN.md`
- AND the referenced submodel file declares `parent_spec.url` matching that URL
- WHEN validation executes
- THEN no template mismatch diagnostic is emitted
