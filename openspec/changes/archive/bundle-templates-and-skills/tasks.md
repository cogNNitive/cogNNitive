# Tasks: Bundle Templates and Skills

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~750–1,100 lines across `eNNvironment` (manifest schema & validator), `actioNN` (skills manager CLI & skill frontmatter), and `iNNfo` (multi-store template resolver & MCP tools) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Manifest & Lifecycle Foundation): `eNNvironment` manifest schema & `validate-manifest.js` validation rules, `actioNN` `skills-manager.js` CLI expansion, state migration to `bootstrap-state.json`, and `SKILL.md` `bundled_templates` declarations; PR 2 (Resolver & MCP Integration): `iNNfo` multi-store template resolver in `innfo-core`, taxonomy validator integration, `innfo-mcp` `list_templates` and `hydrate_templates` tools, and test suites across repos. |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Manifest schema, structural validator, skills & templates lifecycle CLI, state migration, and bundled template frontmatter | PR 1 | `node eNNvironment/scripts/validate-manifest.js` & `node actioNN/scripts/skills-manager.js status` | CLI execution against manifest & state | Revert PR 1 |
| 2 | Multi-store Level 2 template resolver, taxonomy validation, MCP template tools, and test suites | PR 2 | `npm run test -- packages/innfo-core packages/innfo-mcp` | MCP tool execution / spec resolution | Revert PR 2 only |

---

## Phase 1: Manifest Schema & Validator (`eNNvironment`)

- [x] 1.1 Update `docs/use/manifest.md` schema documentation to formally define `agent-bootstrap.templates` array (with `name`, `repo`, `path`, `version`, `commit`) alongside `skills`, `workflows`, and `entrypoint`.
- [x] 1.2 Extend `scripts/validate-manifest.js` Node.js YAML parser to support `templates` block as an optional array to preserve backward compatibility for legacy manifests.
- [x] 1.3 Update `scripts/validate-manifest.js` to validate template entries against GitHub API (verifying commit SHA existence and path existence on remote repository).
- [x] 1.4 Update `scripts/validate-manifest.js` to enforce version parity between manifest `version` declarations and template header/frontmatter metadata.
- [x] 1.5 Update `scripts/validate-manifest.js` to check dependency closure across skills (`templates: [...]` references) and workflows (`template: ...` references), ensuring all referenced templates are declared in top-level `templates` or bundled in referenced skills.

---

## Phase 2: Skills & Templates Lifecycle Manager (`actioNN`)

- [x] 2.1 Update state management in `scripts/skills-manager.js` to migrate legacy `skills-state.json` to combined `~/.agents/bootstrap-state.json`, tracking both skills and templates versioning, paths, and commit SHAs.
- [x] 2.2 Implement standalone template tarball fetching and extraction logic in `scripts/skills-manager.js`, saving installed templates to `~/.agents/templates/${name}.md` or workspace `./templates/`.
- [x] 2.3 Extend `SKILL.md` frontmatter parsing in `scripts/skills-manager.js` to extract `bundled_templates` declarations and unpack embedded `templates/` directory during skill installation and sync.
- [x] 2.4 Standardize `bundled_templates` frontmatter array across `skills/*/SKILL.md` files in `actioNN`.
- [x] 2.5 Update CLI subcommands (`status`, `install`, `update`, `sync`) in `scripts/skills-manager.js` to process both skills and standalone/bundled templates in unified lifecycle output.
- [x] 2.6 Implement TTY interactive consent gates (`needs decision: ...`) with `--yes` / `-y` bypass flag for all template/skill installation, update, and overwrite operations in `scripts/skills-manager.js`.

---

## Phase 3: Multi-Store Spec Resolution & MCP (`iNNfo`)

- [x] 3.1 Create multi-store spec template resolver `packages/innfo-core/src/resolver.ts` implementing `resolveTemplatePath()` with precedence searching: 1) local `./templates/`, 2) global `~/.agents/templates/`, 3) installed skill paths `~/.agents/skills/*/templates/`.
- [x] 3.2 Implement `UnresolvedTemplateError` in `packages/innfo-core/src/resolver.ts` with detailed diagnostics enumerating all checked search directories when a template is missing.
- [x] 3.3 Integrate `resolveTemplatePath()` into `packages/innfo-core/src/recursiveParser/workspace.ts` during workspace entrypoint and Level 2 spec template parsing.
- [x] 3.4 Update taxonomy validators in `packages/innfo-core` to evaluate workspace concept primitives (`Workspace`, `ModelRef`, `Folder`, `Asset`) against resolved Level 2 spec templates regardless of their store location.
- [x] 3.5 Create/update MCP tools in `packages/innfo-mcp/src/tools/spec.ts` to expose `list_templates` (enumerating all available templates across local, global, and skill stores) and `hydrate_template` (copying selected template from global/skill store into active workspace `./templates/`).

---

## Phase 4: Testing & Verification

- [x] 4.1 Unit tests for `validate-manifest.js` (`eNNvironment`): Test valid manifests, invalid GitHub commit SHAs, missing file paths, version parity mismatches, missing dependency closure, and legacy manifests without `templates`.
- [x] 4.2 Integration unit tests for `skills-manager.js` (`actioNN`): Test `install`, `update`, `sync`, and `status` subcommands, state migration to `bootstrap-state.json`, `bundled_templates` extraction, and TTY interactive consent (`needs decision:` prompt vs `--yes` flag).
- [x] 4.3 Unit tests for `innfo-core` resolver (`iNNfo`): Test `resolveTemplatePath()` precedence order (workspace > global > skill), multi-store fallback logic, and `UnresolvedTemplateError` search diagnostics output.
- [x] 4.4 Unit tests for `innfo-core` taxonomy validation: Test model concept and taxonomy validation against templates resolved from global and skill directories.
- [x] 4.5 Integration tests for `innfo-mcp` tools: Test `list_templates` output structure and `hydrate_template` copying behavior into target workspace `./templates/`.
- [x] 4.6 End-to-end verification: Execute end-to-end CLI validation, template installation/sync, and multi-store spec resolution workflow.
