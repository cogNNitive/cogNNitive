# Delta for Workspace Entrypoint & Multi-Store Template Resolution

## MODIFIED Requirements

### Requirement: Multi-Store Spec Template Precedence and Resolution

When resolving Level 2 spec templates referenced in workspace entrypoints (e.g. `workspace_V_0-3-0_spec_NN.md`, `parent_spec::`, or explicit `template::` declarations), `innfo-core` MUST search candidate locations in strict precedence order:
1. Workspace-local directory (`./templates/` or workspace root)
2. Global user agents directory (`~/.agents/templates/`)
3. Installed skill template directories (`~/.agents/skills/*/templates/`)

The parser MUST resolve and load the first matching spec template found in this precedence order. The unversioned alias `workspace_spec_NN.md` is retired: it MUST NOT be distributed by any store; resolution targets for the workspace family MUST use versioned names such as `workspace_V_0-3-0_spec_NN.md`. Legacy workspaces that already carry a local alias copy MAY still resolve it.
(Previously: `workspace_spec_NN.md` was the canonical referenced name across all stores.)

#### Scenario: Template resolved from local workspace directory
- GIVEN a workspace containing `./templates/workspace_V_0-3-0_spec_NN.md`
- AND a global template `~/.agents/templates/workspace_V_0-3-0_spec_NN.md` also exists
- WHEN `innfo-core` resolves `workspace_V_0-3-0_spec_NN.md` during workspace parsing
- THEN the local workspace file `./templates/workspace_V_0-3-0_spec_NN.md` is loaded
- AND global or skill-bundled templates are ignored

#### Scenario: Fallback resolution to global user templates
- GIVEN a workspace without a local `./templates/workspace_V_0-3-0_spec_NN.md`
- AND `~/.agents/templates/workspace_V_0-3-0_spec_NN.md` exists in the global user directory
- WHEN `innfo-core` resolves `workspace_V_0-3-0_spec_NN.md`
- THEN `~/.agents/templates/workspace_V_0-3-0_spec_NN.md` is loaded as the primary Level 2 spec template

#### Scenario: Fallback resolution to skill-bundled templates
- GIVEN a workspace lacking local and global copies of a referenced template `projects_V_0-1-0_NN.md`
- AND an installed skill at `~/.agents/skills/nn-innfo/templates/projects_V_0-1-0_NN.md` contains the template
- WHEN `innfo-core` resolves `projects_V_0-1-0_NN.md`
- THEN the template is resolved and loaded from `~/.agents/skills/nn-innfo/templates/projects_V_0-1-0_NN.md`

#### Scenario: Skill-bundled canonical workspace template resolves
- GIVEN a workspace lacking local and global copies of `workspace_V_0-3-0_spec_NN.md`
- AND `~/.agents/skills/nn-innfo/templates/workspace_V_0-3-0_spec_NN.md` is the bundled canonical copy
- WHEN `innfo-core` resolves `workspace_V_0-3-0_spec_NN.md`
- THEN the canonical copy is loaded from the skill tier

### Requirement: MCP Template Discovery and Workspace Hydration Tools

`innfo-mcp` MUST expose tools to list available Level 2 spec templates across all resolution stores and hydrate selected templates into an active workspace's `./templates/` directory. Hydration of the canonical workspace template MUST use the full versioned stem `workspace_V_0-3-0_spec_NN`; the bare stem `workspace_V_0-3-0` MUST NOT be used as a hydration name because it does not resolve.
(Previously: hydration examples used unversioned names such as `workspace_spec_NN`.)

#### Scenario: Listing templates via MCP tool
- GIVEN available templates present in `./templates/`, `~/.agents/templates/`, and `~/.agents/skills/*/templates/`
- WHEN the `list_templates` MCP tool is invoked
- THEN a structured JSON array is returned listing all discovered templates, their versions, and their source location category (`workspace`, `global`, `skill:<name>`)

#### Scenario: Hydrating skill template into local workspace
- GIVEN a template `projects_V_0-1-0_NN.md` residing in `~/.agents/skills/nn-innfo/templates/`
- WHEN the `hydrate_template` MCP tool is invoked with `template_name: "projects_V_0-1-0_NN"` for the active workspace
- THEN `projects_V_0-1-0_NN.md` is copied into the workspace's `./templates/` directory
- AND subsequent resolutions prioritize the newly copied workspace-local template

#### Scenario: Hydrating the canonical versioned workspace template
- GIVEN the canonical template `workspace_V_0-3-0_spec_NN.md` in the versioned store
- WHEN `hydrate_template` is invoked with `template_name: "workspace_V_0-3-0_spec_NN"`
- THEN the versioned file is copied into the workspace's `./templates/` directory
- AND an invocation with the bare stem `workspace_V_0-3-0` does not silently resolve to the versioned file

## ADDED Requirements

### Requirement: Wizard Model Workflow Binds to the Canonical Versioned Template

The manifest `model` workflow (`manifest/source.yaml` `workflows[model].template`) MUST reference `workspace_V_0-3-0_spec_NN` instead of the retired alias `workspace_spec_NN`. `hydrateTemplate('workspace_V_0-3-0_spec_NN')` MUST resolve through the existing store precedence without new `innfo-mcp` code. The hydrate fixture in `iNNfo/packages/innfo-mcp/src/tools/spec.spec.ts` MUST pin the versioned name as a regression guard. Regenerated manifest docs (`docs/use/manifest.md`, `docs/use/manifest-next.md`) MUST reflect the rebind.

#### Scenario: Wizard bootstraps from the versioned template
- GIVEN a user runs the wizard `model` workflow
- WHEN the workflow hydrates the workspace template
- THEN `hydrateTemplate('workspace_V_0-3-0_spec_NN')` resolves the canonical template
- AND the scaffolded `workspace_NN.md` declares `parent_spec` pointing at the `workspace_V_0-3-0_spec_NN.md` URL

#### Scenario: Hydration regression is guarded by fixture
- GIVEN the change is applied
- WHEN `spec.spec.ts` runs its hydrate fixture
- THEN hydration resolves `workspace_V_0-3-0_spec_NN` from the versioned store

#### Scenario: Regenerated manifest docs reflect the rebind
- GIVEN `generate-manifest.js` runs with `--check` on the stable and preview channels
- WHEN `docs/use/manifest.md` and `docs/use/manifest-next.md` are regenerated
- THEN the `model` workflow lists `workspace_V_0-3-0_spec_NN`
- AND the retired alias, `cogNNitive`, and `base` entries are absent from the ACTIVE template lists