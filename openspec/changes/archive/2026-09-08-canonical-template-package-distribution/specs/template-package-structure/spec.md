# Delta for Template Package Structure & Local Cache

## Purpose

Standardize template packaging into canonical unversioned files in source control (`main`), hydrate complete packages into versioned local workspace directories (`specs/templates/<name>/<version>/`), establish multi-tier resolution precedence across workspace and global locations, and implement atomic, immutable hydration from release tags.

## MODIFIED Requirements

### Requirement: Standardized Package Directory Layout

Template packages in source repositories (`main` branch) MUST use canonical unversioned filenames under `iNNfo/specs/templates/<template-name>/`:
- The primary Level 2 specification file MUST be named `spec_NN.md`.
- Standard Operating Procedures MUST reside in `procedures/` using canonical unversioned filenames.
- Sample models MUST reside in `samples/` using canonical unversioned filenames.
- Static layout assets, reference dashboards, and media MUST reside in `assets/` (e.g., `assets/master.html`).
- Optional agent skill manifests MUST reside in `skills/`.
- File paths in the source repository MUST NOT encode semantic versions. Instead, template metadata MUST declare the semantic version in the frontmatter (`template_version: "<version>"`).

In local workspaces and global user caches, template packages MUST be hydrated into versioned directory structures located under `specs/templates/<template-name>/<version>/` (e.g. `specs/templates/workspace/0.3.0/` or `specs/templates/workspace/V_0-3-0/`), containing the unversioned canonical package assets (`spec_NN.md`, `procedures/`, `samples/`, `assets/`, `skills/`).

For backward compatibility, resolution MUST continue to resolve legacy flat template files (e.g. `<name>_V_<version>_NN.md` in `./templates/` or `./specs/`) when a versioned package directory is not present.
(Previously: template packages permitted versioned filenames in source repositories, such as `<name>_V_<version>_NN.md`.)

#### Scenario: Canonical unversioned layout in source repository
- GIVEN the template source repository on the `main` branch
- WHEN inspecting `iNNfo/specs/templates/business/`
- THEN the main specification is named `spec_NN.md` without an embedded version in the filename
- AND its YAML frontmatter declares `template_version: "0.2.1"`
- AND package assets reside in unversioned subdirectories `procedures/`, `samples/`, and `assets/` (such as `assets/master.html`)

#### Scenario: Versioned directory layout in local workspace cache
- GIVEN template package `business` version `0.2.1` is hydrated into a project workspace
- WHEN inspecting the workspace directory structure
- THEN the package is located at `specs/templates/business/0.2.1/`
- AND `spec_NN.md` is present as the main Level 2 template specification
- AND subdirectories `procedures/`, `samples/`, and `assets/` contain the package SOPs, sample models, and reference layouts (e.g. `assets/master.html`)

#### Scenario: Backward-compatible resolution of legacy flat templates
- GIVEN a workspace containing a flat template file at `./templates/business_V_0-1-0_NN.md`
- WHEN `resolver.ts` resolves the template request for `business` `V_0-1-0`
- THEN resolution falls back to the legacy flat file if `specs/templates/business/V_0-1-0/` does not exist

---

### Requirement: Multi-Tier Local Cache and Resolution Precedence

Template resolution MUST traverse local, global, and remote sources in deterministic precedence order:
1. Workspace package directory: `./specs/templates/<name>/<version>/`
2. Workspace flat fallback: `./templates/<name>_V_<version>_NN.md` or `./specs/`
3. Global user cache: `~/.agents/templates/<name>/<version>/`
4. Installed skill directories: `~/.agents/skills/*/templates/<name>/<version>/`
5. Tag-pinned remote hydration: fetch and extract complete package from release tag `templates-v<version>`

(Previously: resolution precedence only covered local directories without remote tag-pinned fallback.)

#### Scenario: Resolving template from workspace package directory first
- GIVEN a template available in both `./specs/templates/business/0.3.0/` and `~/.agents/templates/business/0.3.0/`
- WHEN `innfo-core` or `innfo-mcp` resolves `business` `0.3.0`
- THEN the workspace package version `./specs/templates/business/0.3.0/` is selected

#### Scenario: Resolution fallback to global user cache
- GIVEN a template `projects` `0.3.0` that is absent in the current workspace `./specs/templates/`
- BUT present in `~/.agents/templates/projects/0.3.0/`
- WHEN template resolution is executed
- THEN the global user cache directory `~/.agents/templates/projects/0.3.0/` is returned

#### Scenario: Resolution fallback to installed skill package
- GIVEN a template embedded within an installed skill at `~/.agents/skills/nn-innfo/templates/projects/0.3.0/`
- WHEN the template is absent in workspace and global user cache
- THEN resolution successfully locates and loads the template from the installed skill path

#### Scenario: Resolution fallback to remote tag-pinned hydration
- GIVEN a template `workspace` `0.3.0` absent from workspace, global user cache, and skill directories
- WHEN template resolution is executed with remote hydration enabled
- THEN the package is hydrated from release tag `templates-v0.3.0` into `./specs/templates/workspace/0.3.0/`
- AND the newly hydrated workspace package is loaded

---

### Requirement: Immutable Atomic Hydration and Remote Fetching

When a requested template package is not available locally, `innfo-mcp` MUST download the complete template package assets (`spec_NN.md`, `procedures/`, `samples/`, `assets/`, and optional `skills/`) from the release tag asset or Git tree corresponding to the pinned tag (e.g. `templates-v<version>`).

The fetch operation MUST download assets into a temporary staging directory and atomically move/rename into `specs/templates/<name>/<version>/` upon verification of complete package contents. Once populated, versioned package directories MUST be treated as immutable write-once caches. Redundant network downloads MUST NOT occur if the directory is already populated.
(Previously: hydration fetched individual spec files rather than complete package trees.)

#### Scenario: Atomic remote download and complete package extraction
- GIVEN a remote template package release at tag `templates-v0.2.1` containing `spec_NN.md`, `procedures/`, `samples/`, and `assets/` (e.g. `assets/master.html`)
- WHEN `innfo-mcp` fetches the missing template package for `business` `0.2.1`
- THEN all package contents are downloaded into a temporary staging directory
- AND atomically renamed to `specs/templates/business/0.2.1/` upon completion
- AND `spec_NN.md`, SOP procedures, samples, and static layout assets are all accessible locally

#### Scenario: Write-once immutability enforcement
- GIVEN an existing local package directory at `specs/templates/workspace/0.3.0/`
- WHEN a fetch operation is requested for the same version
- THEN existing cached contents are preserved without redundant re-downloading or modification

---

## RETIRED Capabilities & Requirements

### Retirement: Template Version Pruning (`template-version-pruning`)

The `template-version-pruning` capability and its associated `prune_orphaned_specs` MCP tool are RETIRED. Local workspace template packages are maintained in isolated versioned directories (`specs/templates/<name>/<version>/`) keyed to immutable Git release tags. Because package contents are immutable and isolated, retention of previously hydrated versions does not pollute the `main` source branch and preserves reproducible builds for historical models without requiring reachability pruning.

### Retirement: Legacy File-Cloning Immutability Guard (`template-immutability-guard`)

The legacy file-cloning guard in `scripts/guard-template-immutability.js` is RETIRED. Immutability of template releases is now anchored to immutable Git release tags (`templates-v<version>`), while modifications to canonical unversioned templates in `main` (`iNNfo/specs/templates/`) are governed by CI frontmatter version bump validation rather than blocking in-place edits.
