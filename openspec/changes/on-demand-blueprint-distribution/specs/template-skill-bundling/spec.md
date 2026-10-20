# Delta Spec: template-skill-bundling

## MODIFIED Requirements

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
