# Delta for template-package-structure

## MODIFIED Requirements

### Requirement: Multi-Tier Local Cache and Resolution Precedence

Template resolution MUST traverse local and global locations in deterministic order:
1. Workspace unversioned package directory: `./specs/bluepriNNts/<name>/spec_NN.md` (recognized only when a spec file exists in that directory)
2. Workspace package directory: `./specs/bluepriNNts/<name>/<version>/`
3. Workspace flat fallback: `./templates/<name>_V_<version>_NN.md` or `./specs/`
4. Global user cache: `~/.agents/templates/<name>/<version>/`
5. Installed skill directories: `~/.agents/skills/*/templates/<name>/<version>/`

(Previously: Tier 1 was only the versioned workspace package directory, so an unversioned workspace package was invisible to resolution.)

#### Scenario: Resolving template from workspace package directory first

- GIVEN a template available in both `./specs/bluepriNNts/business/V_0-2-0/` and `~/.agents/templates/business/V_0-2-0/`
- WHEN `innfo-core` or `innfo-mcp` resolves `business` `V_0-2-0`
- THEN the workspace package version `./specs/bluepriNNts/business/V_0-2-0/` is selected

#### Scenario: Unversioned workspace package recognized

- GIVEN a canonical unversioned package at `./specs/bluepriNNts/business/spec_NN.md` with a `procedures/` directory
- WHEN the package is resolved
- THEN the unversioned workspace directory is selected before global or skill tiers
- AND procedure discovery still succeeds

#### Scenario: Empty unversioned directory not matched

- GIVEN `./specs/bluepriNNts/business/` exists without `spec_NN.md`
- WHEN resolution runs
- THEN the unversioned tier does not fire

#### Scenario: Resolution fallback to global user cache

- GIVEN a template `projects` `V_0-2-0` that is absent in the current workspace `./specs/bluepriNNts/`
- BUT present in `~/.agents/templates/projects/V_0-2-0/`
- WHEN template resolution is executed
- THEN the global user cache directory `~/.agents/templates/projects/V_0-2-0/` is returned

#### Scenario: Resolution from installed skill package

- GIVEN a template embedded within an installed skill at `~/.agents/skills/nn-innfo/templates/projects/V_0-2-0/`
- WHEN the template is absent in workspace and global user cache
- THEN resolution successfully locates and loads the template from the installed skill path
