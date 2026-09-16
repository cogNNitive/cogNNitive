# Spec: Mutation Schema Conformance

Governs `applyMutation` in `@cognnitive/innfo-core`, the single mutation entry
point shared by `innfo-mcp` (`apply_change`) and `innfo-editor`.

## Context

`LEVEL2_ONLY_OPS` gates `add_concept`, `add_field` and `set_marker` to level-2
documents, so an agent cannot extend the schema from inside a user's model. The
gate is correct and well-argued, but it has a hole: `addElement` does
`model.elements.get(conceptName) ?? []` and writes, never consulting the
`schema` argument it is handed. A typo'd concept name therefore creates a new
concept inside a level-3 model — the exact outcome the gate exists to prevent —
and `apply_change` then writes it to disk.

## Specification Requirements

### Requirement 1: `add_element` Respects The Resolved Schema

When a `TemplateSchema` is supplied, `add_element` MUST reject a `conceptName`
the schema does not declare.

- **GIVEN** a level-3 model whose template declares the concepts
  `Assumptions`, `Risks`, `Keys`
- **WHEN** `applyMutation(model, 'add_element', { conceptName: 'Rsiks', … }, schema)`
  is called
- **THEN** the result MUST be `{ success: false, errors: [...] }`
- **AND** `model.elements` MUST NOT gain an `Rsiks` entry
- **AND** the model MUST be byte-identical to its pre-call state

### Requirement 2: Actionable Error With A Suggestion

The rejection message MUST name the offending concept, and MUST suggest the
closest declared concept when one is within a small edit distance.

- **GIVEN** the rejection above
- **THEN** the error message MUST contain `"Rsiks"` and MUST suggest `"Risks"`
- **AND** it MUST list the declared concepts when no close match exists

### Requirement 3: Schemaless Mutation Is Unchanged

- **GIVEN** `applyMutation` is called with no `schema` argument
- **WHEN** `add_element` runs with any `conceptName`
- **THEN** the current permissive behaviour MUST be preserved, so callers that
  legitimately have no resolved template (offline scaffolding, tests) keep
  working

### Requirement 4: The Same Rule Applies To `update_field`

`update_field` already fails on an unknown concept because it looks the concept
up before writing. That behaviour MUST be preserved and covered by a test, so
the two element-level ops stay consistent.

### Requirement 5: Atomicity Is Preserved

A rejected mutation MUST leave the caller's model reference untouched, per the
existing clone-then-assign contract in `mutate.ts`.
