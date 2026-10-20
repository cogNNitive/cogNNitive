# Delta Spec: template-dynamic-discovery

## MODIFIED Requirements

### Requirement: MCP Endpoint Exposure and Skill Integration

`innfo-mcp` MUST expose `list_blueprints` (alongside `list_blueprint_procedures` / `list_template_procedures` and `list_blueprint_skills` / `list_template_skills`) tools. `list_blueprints` MUST merge local disk and embedded Core state with `catalog.json` metadata so that every Core and catalog `bluepriNNt` entry reports `installed` (boolean), `tier`, `access`, `when_to_use`, and `embedded_skills`. `nn-innfo` and agent workflows MUST query these endpoints to discover both installed and on-demand available `bluepriNNts`, SOP procedures, and skills dynamically.

(Previously: `innfo-mcp` only listed locally installed or statically embedded templates/blueprints without merging `catalog.json` availability, tier, access, and installation status metadata.)

#### Scenario: Querying blueprints via list_blueprints merges local and catalog state
- **GIVEN** the 7 Core `bluepriNNts` are embedded/installed locally and optional vertical `bluepriNNts` exist in `catalog.json`
- **WHEN** an agent invokes `list_blueprints` via MCP
- **THEN** the response includes both Core and catalog `bluepriNNts` with `installed: true` for locally present blueprints and `installed: false` for uncached catalog blueprints
- **AND** each catalog entry includes `tier`, `access`, `when_to_use`, and `embedded_skills` metadata

#### Scenario: Querying procedures via list_template_procedures tool
- **GIVEN** an active model backed by composite template `business-projects`
- **WHEN** an agent invokes `list_template_procedures` (or `list_blueprint_procedures`) via MCP
- **THEN** a JSON list of all available procedures (with `id`, `name`, `path`, `source_template`) is returned

#### Scenario: Querying skills via list_template_skills tool
- **GIVEN** a workspace model with template composition
- **WHEN** an agent invokes `list_template_skills` (or `list_blueprint_skills`) via MCP
- **THEN** a JSON list of required and recommended skills across the template hierarchy is returned
