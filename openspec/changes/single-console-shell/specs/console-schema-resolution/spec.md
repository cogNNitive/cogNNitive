# Delta for console-schema-resolution

## MODIFIED Requirements

### Requirement: Shared Schema Resolution Path

The CLI (`scripts/export-console.mjs`) MUST resolve the model's blueprint schema through ONE implementation in `innfo-core`. For a given model and workspace state, the emitted `schema` slot MUST be byte-identical across runs. The `schema` slot carries no timestamp; `generated` and `citationsResolvedAt` live in `meta` and are NOT part of the `schema` comparison.
(Previously: the CLI and the MCP `build_console_payload` tool both resolved through the shared path and had to emit byte-identical slots.)

#### Scenario: Deterministic slot
- GIVEN one model resolvable through the shared path
- WHEN the CLI exports it twice, whole and scoped to that model
- THEN the two `schema` slots are byte-identical
- AND no timestamp appears in either `schema` slot

#### Scenario: Single implementation
- GIVEN the repository after this change
- WHEN the schema resolution+derivation definition is counted
- THEN exactly one such path exists, in `innfo-core`

### Requirement: Graceful Degradation

When no blueprint resolves, resolution MUST degrade to the derived schema exactly as today and MUST NOT abort the export.
(Previously: also named the MCP tool build.)

#### Scenario: Unresolvable blueprint
- GIVEN a model whose blueprint resolves nowhere
- WHEN the CLI exports
- THEN a derived `schema` slot is emitted
- AND no error aborts the operation

## REMOVED Requirements

### Requirement: Deterministic Golden Fixture

(Reason: it isolated `INNFO_GLOBAL_DIR` and `INNFO_SKILLS_DIR` for the CLI-versus-MCP-tool golden-parity suite, which is deleted with `build_console_payload`.)
(Migration: none. A CLI-only golden test MAY be added later and would carry its own isolation requirement.)
