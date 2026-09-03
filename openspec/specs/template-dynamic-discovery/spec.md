# Template Dynamic Procedure & Skill Discovery

## Purpose

Standardize procedure and skill frontmatter declarations within Level 2 spec templates, establish transitive discovery across composition inheritance trees, and expose MCP endpoints for agent workflow integration in `innfo-mcp` and `actioNN`.

## Requirements

### Requirement: Frontmatter Procedure and Skill Declarations

Level 2 spec template YAML frontmatter MUST support optional `procedures` and `skills` declaration arrays. Each `procedures` entry MUST specify `id`, `name`, and relative `path`. Each `skills` entry MUST specify `name`, `repo`, and relative `path`.

#### Scenario: Template declares attached SOP procedure and agent skill
- GIVEN a Level 2 template `relevamiento` frontmatter containing:
  ```yaml
  procedures:
    - id: "relevar-vivienda"
      name: "Relevamiento de Vivienda"
      path: "procedures/relevamiento_vivienda_NN.md"
  skills:
    - name: "nn-reforma-casa"
      repo: "cogNNitive/actioNN"
      path: "skills/nn-reforma-casa"
  ```
- WHEN the template frontmatter is parsed by `innfo-core`
- THEN the declared procedure and skill metadata are validated and structured into schema attributes

---

### Requirement: Transitive Discovery Across Composition Trees

When resolving a composite template, `innfo-mcp` MUST recursively traverse all `includes` dependencies up to a maximum depth of 10, collecting all declared `procedures` and `skills`. The aggregate set MUST deduplicate entries by `id` (for procedures) and `name` (for skills).

#### Scenario: Aggregating procedures from host and included templates
- GIVEN host template `urbanism` includes template `building`
- AND `urbanism` declares procedure `plan-zoning`
- AND `building` declares procedure `inspect-foundation`
- WHEN transitive discovery is performed for `urbanism`
- THEN both `plan-zoning` and `inspect-foundation` are included in the returned procedure registry

#### Scenario: Cycle detection during transitive discovery
- GIVEN template `A` includes `B`, and `B` includes `A`
- WHEN transitive procedure/skill discovery is executed
- THEN traversal uses a `seen` path tracker, avoiding infinite recursion and capping depth at 10

---

### Requirement: MCP Endpoint Exposure and Skill Integration

`innfo-mcp` MUST expose `list_template_procedures` and `list_template_skills` tools. `nn-innfo` and agent workflows MUST query these endpoints to present relevant SOP procedures and skills dynamically based on the active model's template hierarchy.

#### Scenario: Querying procedures via list_template_procedures tool
- GIVEN an active model backed by composite template `business-projects`
- WHEN an agent invokes `list_template_procedures` via MCP
- THEN a JSON list of all available procedures (with `id`, `name`, `path`, `source_template`) is returned

#### Scenario: Querying skills via list_template_skills tool
- GIVEN a workspace model with template composition
- WHEN an agent invokes `list_template_skills` via MCP
- THEN a JSON list of required and recommended skills across the template hierarchy is returned
