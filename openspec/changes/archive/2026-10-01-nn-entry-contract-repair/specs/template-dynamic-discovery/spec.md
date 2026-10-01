# Spec Delta: Template Dynamic Discovery

## MODIFIED Requirements

### Requirement: Discovery Endpoint Tool Names
The canonical MCP tools for discovering dynamic template procedures and skills MUST be named `list_blueprint_procedures` and `list_blueprint_skills`. References to deprecated legacy names (`list_template_procedures`, `list_template_skills`) MUST be removed across all skill files and documentation.

#### Scenario: Agent requests procedures for blueprint
- GIVEN an active bluepriNNt
- WHEN the agent calls `innfo-mcp_list_blueprint_procedures`
- THEN the registered procedures for that bluepriNNt are returned.
