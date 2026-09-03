# Template Package Structure & Local Cache

## Purpose

Standardize template packaging into versioned directory structures (`specs/templates/<name>/<version>/`), establish multi-tier resolution precedence across workspace and global locations, and implement atomic, immutable hydration for local template caches.

## Requirements

### Requirement: Standardized Package Directory Layout

Template packages MUST follow a standardized directory structure located under `specs/templates/<template-name>/<version>/`. Each template package directory MUST contain a canonical Level 2 specification file (`spec_NN.md` or `<name>_V_<version>_NN.md`), and MAY include `samples/` containing sample Level 3 models, `procedures/` containing Standard Operating Procedure specifications, and `skills/` containing agent skill manifests.

#### Scenario: Validating standardized package directory structure
- GIVEN a template package for `business` version `V_0-2-0`
- WHEN the template package is stored at `specs/templates/business/V_0-2-0/`
- THEN `spec_NN.md` is present as the main Level 2 template specification
- AND subdirectories `samples/`, `procedures/`, and `skills/` store optional package assets

#### Scenario: Backward-compatible resolution of legacy flat templates
- GIVEN a workspace containing a flat template file at `./templates/business_V_0-1-0_NN.md`
- WHEN `resolver.ts` resolves the template request for `business` `V_0-1-0`
- THEN resolution falls back to the legacy flat file if `specs/templates/business/V_0-1-0/` does not exist

---

### Requirement: Multi-Tier Local Cache and Resolution Precedence

Template resolution MUST traverse local and global locations in deterministic order:
1. Workspace package directory: `./specs/templates/<name>/<version>/`
2. Workspace flat fallback: `./templates/<name>_V_<version>_NN.md` or `./specs/`
3. Global user cache: `~/.agents/templates/<name>/<version>/`
4. Installed skill directories: `~/.agents/skills/*/templates/<name>/<version>/`

#### Scenario: Resolving template from workspace package directory first
- GIVEN a template available in both `./specs/templates/business/V_0-2-0/` and `~/.agents/templates/business/V_0-2-0/`
- WHEN `innfo-core` or `innfo-mcp` resolves `business` `V_0-2-0`
- THEN the workspace package version `./specs/templates/business/V_0-2-0/` is selected

#### Scenario: Resolution fallback to global user cache
- GIVEN a template `projects` `V_0-2-0` that is absent in the current workspace `./specs/templates/`
- BUT present in `~/.agents/templates/projects/V_0-2-0/`
- WHEN template resolution is executed
- THEN the global user cache directory `~/.agents/templates/projects/V_0-2-0/` is returned

#### Scenario: Resolution from installed skill package
- GIVEN a template embedded within an installed skill at `~/.agents/skills/nn-innfo/templates/projects/V_0-2-0/`
- WHEN the template is absent in workspace and global user cache
- THEN resolution successfully locates and loads the template from the installed skill path

---

### Requirement: Immutable Atomic Hydration and Remote Fetching

When a requested template package is not available locally, `innfo-mcp` MUST download and extract the remote package into `specs/templates/<name>/<version>/` using an atomic directory swap operation. Once populated, versioned package directories MUST be treated as immutable write-once caches.

#### Scenario: Atomic remote download and package extraction
- GIVEN a remote template URL `https://raw.githubusercontent.com/.../specs/templates/business/V_0-2-0/spec_NN.md`
- WHEN `innfo-mcp` fetches the missing template package
- THEN package contents are downloaded into a temporary staging directory
- AND atomically renamed to `specs/templates/business/V_0-2-0/` upon completion

#### Scenario: Write-once immutability enforcement
- GIVEN an existing local package directory at `specs/templates/business/V_0-2-0/`
- WHEN a fetch operation is requested for the same version
- THEN existing cached contents are preserved without redundant re-downloading or accidental modification
