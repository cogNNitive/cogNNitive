# Specification: Template Composition Integrity and Validation Gate

## Requirement: Semantic Composition Validation in Preflight Check

The preflight check and repository integrity check must validate the semantic integrity and AST composition of all canonical templates.

### Scenario: Preflight detects template composition errors before scaffolding
- **GIVEN** a workspace configured with `nn-preflight` and a local or canonical template containing conflicting concept definitions in its `includes:` hierarchy
- **WHEN** the user or agent executes `preflight-check.js` or triggers the `nn-preflight` skill
- **THEN** the check must inspect all template compositions
- **AND** report any namespace collisions, unresolved parent specs, or broken matrix endpoints as an explicit `WARNING` or `BLOCKER`
- **AND** prevent green-light false-positive status.

### Scenario: Clean composition passes preflight
- **GIVEN** canonical templates with valid non-colliding `includes:` specifications and resolvable matrix source/target pairs
- **WHEN** preflight check executes
- **THEN** preflight reports `Template Composition: OK (N templates valid)` with no blockers.

---

## Requirement: Disambiguated `business_V_0-2-4` Template

The `business_V_0-2-4` template must cleanly compose `business-model`, `analysis`, `organization`, `projects`, and `metrics` without node collisions.

### Scenario: Model instantiation against `business_V_0-2-4`
- **GIVEN** a model declaring `parent_spec: business_V_0-2-4`
- **WHEN** validated by `innfo-mcp` or `@cognnitive/innfo-core`
- **THEN** validation succeeds without concept collision between `business-model` metrics references and the `metrics` template index.
