# Workspace Entrypoint & Multi-Store Template Resolution

## Purpose

Establish dynamic multi-location Level 2 spec template resolution in `innfo-core` and `innfo-mcp`, enabling workspace parsers and taxonomy validators to locate referenced spec templates across workspace local `./templates/`, global user environments (`~/.agents/templates/`), and installed skill template directories (`~/.agents/skills/*/templates/`), while exposing MCP tools for listing and hydrating workspace templates.

## Requirements

### Requirement: Multi-Store Spec Template Precedence and Resolution

When resolving Level 2 spec templates referenced in workspace entrypoints (e.g. `workspace_spec_NN.md`, `parent_spec::`, or explicit `template::` declarations), `innfo-core` MUST search candidate locations in strict precedence order:
1. Workspace-local directory (`./templates/` or workspace root)
2. Global user agents directory (`~/.agents/templates/`)
3. Installed skill template directories (`~/.agents/skills/*/templates/`)

The parser MUST resolve and load the first matching spec template found in this precedence order.

#### Scenario: Template resolved from local workspace directory
- GIVEN a workspace containing `./templates/workspace_spec_NN.md`
- AND a global template `~/.agents/templates/workspace_spec_NN.md` also exists
- WHEN `innfo-core` resolves `workspace_spec_NN.md` during workspace parsing
- THEN the local workspace file `./templates/workspace_spec_NN.md` is loaded
- AND global or skill-bundled templates are ignored

#### Scenario: Fallback resolution to global user templates
- GIVEN a workspace without a local `./templates/workspace_spec_NN.md`
- AND `~/.agents/templates/workspace_spec_NN.md` exists in the global user directory
- WHEN `innfo-core` resolves `workspace_spec_NN.md`
- THEN `~/.agents/templates/workspace_spec_NN.md` is loaded as the primary Level 2 spec template

#### Scenario: Fallback resolution to skill-bundled templates
- GIVEN a workspace lacking local and global copies of a referenced template `projects_V_0-1-0_NN.md`
- AND an installed skill at `~/.agents/skills/nn-innfo/templates/projects_V_0-1-0_NN.md` contains the template
- WHEN `innfo-core` resolves `projects_V_0-1-0_NN.md`
- THEN the template is resolved and loaded from `~/.agents/skills/nn-innfo/templates/projects_V_0-1-0_NN.md`

---

### Requirement: Taxonomy Metamodel Validation and Unresolved Diagnostic Reporting

`innfo-core` taxonomy validators MUST evaluate workspace entrypoint concept primitives (`Workspace`, `ModelRef`, `Folder`, `Asset`) and validation rules against the resolved Level 2 spec template regardless of its source location. If a declared spec template cannot be located in any search path, `innfo-core` MUST raise a structured template resolution error detailing all checked paths.

#### Scenario: Metamodel concepts validate against resolved skill-bundled template
- GIVEN a workspace entrypoint referencing `parent_spec:: projects_V_0-1-0_NN.md`
- AND `projects_V_0-1-0_NN.md` is resolved from an installed skill directory
- WHEN taxonomy validation executes on the workspace model graph
- THEN concepts and properties declared in `projects_V_0-1-0_NN.md` are correctly validated

#### Scenario: Unresolved template reports full path search diagnostics
- GIVEN a workspace entrypoint referencing `parent_spec:: non_existent_spec_NN.md`
- AND `non_existent_spec_NN.md` does NOT exist in local `./templates/`, global `~/.agents/templates/`, or any installed skill `templates/` folder
- WHEN `innfo-core` executes template resolution
- THEN parsing fails with an `UnresolvedTemplateError`
- AND the error message explicitly enumerates all checked search paths

---

### Requirement: MCP Template Discovery and Workspace Hydration Tools

`innfo-mcp` MUST expose tools to list available Level 2 spec templates across all resolution stores and hydrate selected templates into an active workspace's `./templates/` directory.

#### Scenario: Listing templates via MCP tool
- GIVEN available templates present in `./templates/`, `~/.agents/templates/`, and `~/.agents/skills/*/templates/`
- WHEN the `list_templates` MCP tool is invoked
- THEN a structured JSON array is returned listing all discovered templates, their versions, and their source location category (`workspace`, `global`, `skill:<name>`)

#### Scenario: Hydrating skill template into local workspace
- GIVEN a template `projects_V_0-1-0_NN.md` residing in `~/.agents/skills/nn-innfo/templates/`
- WHEN the `hydrate_template` MCP tool is invoked with `template_name: "projects_V_0-1-0_NN"` for the active workspace
- THEN `projects_V_0-1-0_NN.md` is copied into the workspace's `./templates/` directory
- AND subsequent resolutions prioritize the newly copied workspace-local template
