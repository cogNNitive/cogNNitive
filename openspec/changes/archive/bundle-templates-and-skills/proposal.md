# Proposal: Bundle Templates and Skills

## Intent
Establish unified template and skill bundling across `actioNN`, `iNNfo`, and `eNNvironment`. This enables ecosystem components to pin, validate, download, hydrate, and resolve Level 2 spec templates (such as `workspace_spec_NN.md`, `projects`, etc.) alongside skills in `agent-bootstrap` manifests and local/global agent environments.

## Scope
* Extend `eNNvironment/docs/use/manifest.md` schema to formally include `agent-bootstrap.templates` array and embedded skill template declarations.
* Update `eNNvironment/scripts/validate-manifest.js` parser to validate `templates` block structural integrity, commit existence on GitHub API, file existence, version parity, and dependency closure.
* Upgrade `actioNN/scripts/skills-manager.js` to manage both skills and templates (`install`, `update`, `sync`, `status`), persisting state in `~/.agents/bootstrap-state.json`.
* Standardize `bundled_templates` frontmatter array across `actioNN/skills/*/SKILL.md` for skill-encapsulated templates.
* Enhance `iNNfo` (`packages/innfo-core` and `packages/innfo-mcp`) to resolve Level 2 spec templates dynamically from workspace `./templates/`, global `~/.agents/templates/`, and skill-bundled template directories.

## Capabilities
* **`template-skill-bundling`**: Top-level manifest pinning and validation for templates (`agent-bootstrap.templates`), alongside support for skill-encapsulated templates (`bundled_templates` in `SKILL.md`). Unified `skills-manager.js` CLI lifecycle for installing, updating, and syncing both templates and skills.
* **`workspace-entrypoint-resolution`**: Multi-location Level 2 template resolution mechanism in `innfo-core` and `innfo-mcp` that checks workspace-local `./templates/`, global `~/.agents/templates/`, and installed skill template locations when resolving `workspace_spec_NN.md` and related spec templates.

## Approach
1. **Manifest Schema & Validation (`eNNvironment`)**:
   * Update `docs/use/manifest.md` specification for `agent-bootstrap` to include `entrypoint`, `skills`, `templates`, and `workflows`.
   * Update `scripts/validate-manifest.js` to fetch and validate template entries on GitHub API, check path existence, check version parity with frontmatter, and enforce closure.
2. **Template & Skill Lifecycle Manager (`actioNN`)**:
   * Expand `skills-manager.js` to handle template tarball downloads and extraction into `~/.agents/templates/` or workspace `./templates/`.
   * Implement template state tracking in `~/.agents/bootstrap-state.json`.
   * Support `bundled_templates` extraction during skill installation and workspace hydration routines.
   * Implement TTY interactive consent gates (`needs decision: ...`, `--yes` flag) for template operations.
3. **Multi-Store Template Resolution (`iNNfo`)**:
   * Modify `innfo-core/src/recursiveParser/workspace.ts` and taxonomy validators to search `./templates/`, `~/.agents/templates/`, and `~/.agents/skills/*/templates/` for referenced Level 2 spec templates.
   * Expose MCP tools in `innfo-mcp` for listing available templates and hydrating workspace template sets.

## Affected Areas
* `actioNN`: `scripts/skills-manager.js`, `skills/*/SKILL.md`
* `eNNvironment`: `docs/use/manifest.md`, `scripts/validate-manifest.js`
* `iNNfo`: `packages/innfo-core/src/recursiveParser/workspace.ts`, `packages/innfo-core/src/validator/*`, `packages/innfo-mcp/src/tools/*`

## Risks
* Version drift between skill logic and standalone Level 2 templates in `agent-bootstrap.templates`.
  * *Mitigation*: Strict validation in `validate-manifest.js` ensures required template version parity and commit existence before deployment.
* Backward compatibility with existing manifests lacking a `templates` block.
  * *Mitigation*: Make `templates` block optional in `validate-manifest.js`; default fallback to bundled skill templates or local `./templates/`.

## Rollback Plan
Revert changes across `actioNN`, `eNNvironment`, and `iNNfo` repositories via Git commits. Existing skill validation and local template loading will remain operational without template manifest integration.

## Success Criteria
* `validate-manifest.js` validates manifests with both `skills` and `templates` blocks, reporting errors for invalid commit SHAs, paths, or version mismatches.
* `skills-manager.js` successfully downloads, installs, updates, and syncs both skills and templates with interactive TTY consent.
* `innfo-core` resolves Level 2 spec templates across workspace `./templates/`, `~/.agents/templates/`, and skill template folders without hardcoded fallback paths.
