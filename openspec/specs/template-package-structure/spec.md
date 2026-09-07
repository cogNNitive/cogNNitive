# Template Package Structure & Local Cache

## Purpose

Standardize template packaging into canonical unversioned files in source control (`main`), hydrate complete packages into versioned local workspace directories (`specs/templates/<name>/<version>/`), establish multi-tier resolution precedence across workspace and global locations, and implement atomic, immutable hydration for local template caches.

## Requirements

### Requirement: Canonical Source Layout (repository `main`)

Template packages in the source repository MUST use canonical unversioned filenames under `iNNfo/specs/templates/<template-name>/`:
- The primary Level 2 specification MUST be named `spec_NN.md` (the root workspace template is `workspace_spec_NN.md`).
- `procedures/`, `samples/`, and `assets/` (static layouts / media, e.g. `assets/master.html`) MUST also use unversioned filenames; `skills/` MAY carry agent skill manifests.
- Source paths MUST NOT encode a semantic version. The authoritative version MUST be declared in frontmatter as `template_version` (`V_x-y-z` or dotted `x.y.z`).

#### Scenario: Canonical source template on `main`
- GIVEN the `business` template on `main`
- WHEN it is stored at `iNNfo/specs/templates/business/spec_NN.md`
- THEN the file carries `template_version` in its frontmatter
- AND no `_V_x-y-z_` token appears in the path

### Requirement: Standardized Hydrated Package Directory Layout

When hydrated into a local workspace or global user cache, template packages MUST be written into a versioned directory `specs/templates/<template-name>/<version>/` containing the canonical package assets (`spec_NN.md`, and — when present upstream — `procedures/`, `samples/`, `assets/`, `skills/`). A backward-compatible alias `<name>_V_<version>_NN.md` MUST accompany `spec_NN.md` so parsed legacy references (`parent_spec: "<name>_V_<version>"`) resolve.

#### Scenario: Validating hydrated package directory structure
- GIVEN a hydrated template package for `business` version `V_0-2-1`
- WHEN the package is stored at `specs/templates/business/V_0-2-1/`
- THEN `spec_NN.md` is present as the main Level 2 template specification
- AND the backward-compatible alias `business_V_0-2-1_NN.md` is present alongside it
- AND subdirectories `samples/`, `procedures/`, and `assets/` store any upstream package assets

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
