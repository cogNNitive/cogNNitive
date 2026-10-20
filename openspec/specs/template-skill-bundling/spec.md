# Template & Skill Bundling

## Purpose

Establish top-level manifest pinning and structural validation for Level 2 templates alongside skills in `agent-bootstrap` manifests, standardize skill-encapsulated template declarations in `SKILL.md` frontmatter, and extend `skills-manager.js` into a unified lifecycle CLI for downloading, installing, updating, syncing, and tracking both skills and templates.
## Requirements
### Requirement: Manifest Schema Extension and Template Validation

The `agent-bootstrap` manifest schema MUST support an optional `templates` array alongside `skills`, `workflows`, and `entrypoint`. The manifest validator (`validate-manifest.js`) MUST validate top-level `templates` entries by verifying commit SHA existence on the GitHub API, checking file path existence, verifying version parity between manifest declarations and template file headers/frontmatter, and verifying dependency closure across skills and workflows.

#### Scenario: Manifest with valid skills and templates block passes validation
- GIVEN an `agent-bootstrap` manifest containing valid `skills` and `templates` entries with matching GitHub commit SHAs and local file versions
- WHEN `validate-manifest.js` runs against the manifest
- THEN validation completes with exit code `0`
- AND all skills and templates are reported as valid

#### Scenario: Manifest with invalid template commit SHA fails validation
- GIVEN an `agent-bootstrap` manifest containing a `templates` entry whose commit SHA does not exist on GitHub
- WHEN `validate-manifest.js` verifies the commit against the GitHub API
- THEN validation fails with an error indicating an unresolvable template commit SHA
- AND validation exits with a non-zero exit code

#### Scenario: Version mismatch between manifest and template frontmatter fails validation
- GIVEN a `templates` entry declaring version `"V_1-0-0"` while the template file header specifies `"V_0-9-0"`
- WHEN `validate-manifest.js` checks version parity
- THEN a version mismatch error is raised identifying the expected versus actual template version

#### Scenario: Manifest without templates block remains backward compatible
- GIVEN a legacy `agent-bootstrap` manifest containing only `skills` and `workflows`
- WHEN `validate-manifest.js` evaluates the manifest
- THEN validation succeeds without throwing missing-key errors for `templates`

---

### Requirement: Skill-Encapsulated Template Declarations

Skill packages MUST support declaring embedded Level 2 spec templates using a `bundled_templates` frontmatter array in `SKILL.md`. When validating a skill, `validate-manifest.js` MUST verify that all templates listed in `bundled_templates` exist under the skill package's `templates/` directory.

#### Scenario: Skill with valid bundled_templates passes validation
- GIVEN a skill package `skills/nn-innfo` with `SKILL.md` listing `bundled_templates: ["workspace_spec_NN", "projects"]`
- AND the files `templates/workspace_spec_NN.md` and `templates/projects.md` exist inside `skills/nn-innfo/`
- WHEN `validate-manifest.js` validates the skill package
- THEN all bundled templates are confirmed present and valid

#### Scenario: Skill referencing missing bundled template fails validation
- GIVEN a `SKILL.md` listing `bundled_templates: ["missing_spec"]`
- AND `templates/missing_spec.md` does NOT exist in the skill directory
- WHEN `validate-manifest.js` checks bundled template existence
- THEN validation fails with a missing bundled template error

---

### Requirement: Unified Skill and Template Lifecycle Management

The `skills-manager.js` script MUST manage skills, Core `bluepriNNts`/templates, and on-demand catalog `bluepriNNts` across lifecycle commands (`status`, `install`, `update`, `sync`). Default `install` and `sync` MUST process Core manifest entries, while `skills-manager.js install --blueprint <name>` MUST resolve `<name>` from `catalog.json` and download it on demand to `~/.agents/bluepriNNts/<name>/`. When installing, updating, or hydrating a `bluepriNNt` package that contains `<bp>/skills/*` (or declares `embedded_skills`), both `skills-manager.js` and `hydrate_blueprint` MUST project those embedded skills into `~/.agents/skills/<skill-name>/`.

(Previously: `skills-manager.js` downloaded all standalone templates from the core manifest without `--blueprint <name>` catalog resolution, and only extracted `templates/` embedded inside skills rather than projecting `<bp>/skills/*` embedded inside blueprints.)

#### Scenario: Installing standalone templates via CLI
- **GIVEN** an `agent-bootstrap` manifest specifying Core `bluepriNNts`/templates
- **WHEN** `skills-manager.js install` is executed without `--blueprint`
- **THEN** Core `bluepriNNts` are extracted from cached commit tarballs to `~/.agents/bluepriNNts/` (or `~/.agents/templates/`)
- **AND** installation state is recorded in `~/.agents/bootstrap-state.json`

#### Scenario: Installing an optional catalog blueprint on demand via --blueprint
- **GIVEN** an optional blueprint `<name>` defined in `catalog.json` with embedded skills under `<name>/skills/*`
- **WHEN** `skills-manager.js install --blueprint <name>` is executed
- **THEN** `<name>` is fetched from its catalog release pin and installed to `~/.agents/bluepriNNts/<name>/`
- **AND** any `<name>/skills/*` directories are projected into `~/.agents/skills/`

#### Scenario: Syncing skill and template states
- **GIVEN** `~/.agents/bootstrap-state.json` tracking installed skills and blueprints/templates
- **WHEN** `skills-manager.js sync` is executed against an updated manifest
- **THEN** outdated skills and installed blueprints are updated to target commit SHAs
- **AND** `bootstrap-state.json` is updated with the new commit SHAs and version metadata

#### Scenario: Unified state persistence in bootstrap-state.json
- **GIVEN** successful installation of skills and blueprints/templates
- **WHEN** `skills-manager.js status` is executed
- **THEN** state information from `~/.agents/bootstrap-state.json` is displayed showing installed vs pinned versions and commits for both skills and blueprints/templates

### Requirement: Interactive Decision Gating and Execution Modes

`skills-manager.js` MUST implement TTY interactive consent gates (`needs decision: ...`) before performing installation, update, or overwrite operations on skills and templates. When executed with `--yes` or `-y`, interactive prompts MUST be bypassed and automatically approved.

#### Scenario: Interactive prompt requires user decision in TTY mode
- GIVEN an interactive terminal execution of `skills-manager.js update`
- WHEN a template or skill file modification or overwrite is pending
- THEN a prompt `needs decision: Update template <name> from <old_sha> to <new_sha>? [y/N]` is displayed
- AND execution waits for user input before proceeding

#### Scenario: Automated execution with --yes flag
- GIVEN `skills-manager.js update --yes` is executed in non-interactive environment
- WHEN pending skill or template updates are detected
- THEN all update actions are automatically confirmed and executed without prompting

