# Specification: Entry Contract Repair & Drift Guard

## ADDED Requirements

### Requirement: MCP Contract Drift Guard Over Shipped Assets
All MCP tools referenced across active skills in `skills/`, sample procedures in `_samples_nn/`, and runtime diagnostic messages MUST strictly resolve to tools registered in `innfo-mcp`'s `server.ts`. Historical immutable specs (`_V_`) and OpenSpec backlog files SHALL be exempt.

#### Scenario: Guard catches un-registered or retired MCP tool names
- GIVEN a markdown file in `skills/` or `_samples_nn/`
- WHEN `scripts/skill-mcp-contract.test.mjs` executes
- THEN every cited `innfo-mcp_<tool>` and registered tool name MUST match the exported tools in `server.ts`
- AND any citation of retired tools (`validate_model`, `list_models`, `check_workspace`, `list_template_procedures`, `list_template_skills`) SHALL fail the test.

## MODIFIED Requirements

### Requirement: Template Cache Staleness Diagnostic Hint
`innfo-mcp`'s `validateKnowledge` tool MUST emit prompt hints recommending `check_domain` or `hydrate_blueprint` when local blueprint cache staleness is detected, and MUST NOT cite the deprecated `check_workspace`.

#### Scenario: Emitting canonical prompt hint on stale cache
- GIVEN a model validated against a stale local template cache
- WHEN `validateKnowledge` runs
- THEN the returned warning `promptHint` MUST contain `check_domain` or `hydrate_blueprint`
- AND MUST NOT contain `check_workspace`.
