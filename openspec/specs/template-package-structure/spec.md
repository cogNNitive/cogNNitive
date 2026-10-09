# Template Package Structure & Local Cache

## Purpose

Standardize template packaging into canonical unversioned files in source control (`main`), hydrate complete packages into versioned local workspace directories (`specs/bluepriNNts/<name>/<version>/`), establish multi-tier resolution precedence across workspace and global locations, and implement atomic, immutable hydration for local template caches.

## Requirements

### Requirement: Canonical Source Layout (repository `main`)

Template packages in the source repository MUST use canonical unversioned filenames under `iNNfo/specs/bluepriNNts/<template-name>/`:
- The primary Level 2 specification MUST be named `spec_NN.md` (the root workspace template is `workspace_spec_NN.md`).
- `procedures/`, `samples/`, and `assets/` (static layouts / media, e.g. `assets/model_viewer.html`) MUST also use unversioned filenames.
- A package MAY embed agent skills as `skills/<skill-name>/SKILL.md`, together with that skill's own scripts, references, tests and vendored data. An embedded skill is part of the package and MUST be versioned only through the package `blueprint_version`/`template_version`.
- Source paths MUST NOT encode a semantic version. The authoritative version MUST be declared in frontmatter as `template_version` (`V_x-y-z` or dotted `x.y.z`).
(Previously: `skills/` MAY carry only agent skill manifests.)

#### Scenario: Canonical source template on `main`
- GIVEN the `business` template on `main`
- WHEN it is stored at `iNNfo/specs/bluepriNNts/business/spec_NN.md`
- THEN the file carries `template_version` in its frontmatter
- AND no `_V_x-y-z_` token appears in the path

#### Scenario: Package embeds a full skill
- GIVEN the `video` package containing `skills/nn-video-script/SKILL.md` plus its `scripts/` and `test/` folders
- WHEN the package layout is inspected
- THEN the skill folder is treated as package content with no versioned path segment

### Requirement: Standardized Hydrated Package Directory Layout

When hydrated into a local workspace or global user cache, template packages MUST be written into a versioned directory `specs/bluepriNNts/<template-name>/<version>/` containing the canonical package assets (`spec_NN.md`, and — when present upstream — `procedures/`, `samples/`, `assets/`, `skills/`). A backward-compatible alias `<name>_V_<version>_NN.md` MUST accompany `spec_NN.md` so parsed legacy references (`parent_spec: "<name>_V_<version>"`) resolve.

#### Scenario: Validating hydrated package directory structure
- GIVEN a hydrated template package for `business` version `V_0-2-1`
- WHEN the package is stored at `specs/bluepriNNts/business/V_0-2-1/`
- THEN `spec_NN.md` is present as the main Level 2 template specification
- AND the backward-compatible alias `business_V_0-2-1_NN.md` is present alongside it
- AND subdirectories `samples/`, `procedures/`, and `assets/` store any upstream package assets

#### Scenario: Backward-compatible resolution of legacy flat templates
- GIVEN a workspace containing a flat template file at `./templates/business_V_0-1-0_NN.md`
- WHEN `resolver.ts` resolves the template request for `business` `V_0-1-0`
- THEN resolution falls back to the legacy flat file if `specs/bluepriNNts/business/V_0-1-0/` does not exist

---

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

---

### Requirement: Immutable Atomic Hydration and Remote Fetching

When a requested template package is not available locally, `innfo-mcp` MUST download and extract the remote package into `specs/bluepriNNts/<name>/<version>/` using an atomic directory swap operation. Once populated, versioned package directories MUST be treated as immutable write-once caches.

#### Scenario: Atomic remote download and package extraction
- GIVEN a remote template URL `https://raw.githubusercontent.com/.../specs/bluepriNNts/business/V_0-2-0/spec_NN.md`
- WHEN `innfo-mcp` fetches the missing template package
- THEN package contents are downloaded into a temporary staging directory
- AND atomically renamed to `specs/bluepriNNts/business/V_0-2-0/` upon completion

#### Scenario: Write-once immutability enforcement
- GIVEN an existing local package directory at `specs/bluepriNNts/business/V_0-2-0/`
- WHEN a fetch operation is requested for the same version
- THEN existing cached contents are preserved without redundant re-downloading or accidental modification

---

### Requirement: Immutability Guard Covers Embedded Skills

The template immutability guard MUST treat any added, modified or removed file under a package's `skills/**` as a change to that package. Such a change MUST require a bump of the package `blueprint_version`, exactly as a change to `spec_NN.md` does.

#### Scenario: Skill edit without version bump is rejected
- GIVEN a change that edits `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/SKILL.md`
- AND leaves the `video` `blueprint_version` unchanged
- WHEN the immutability guard runs
- THEN it fails, naming the package and the skill file

#### Scenario: Skill edit with version bump passes
- GIVEN the same edit together with a `video` `blueprint_version` bump
- WHEN the immutability guard runs
- THEN it passes

### Requirement: Remote Hydration Includes Embedded Skills

Remote hydration of a package MUST fetch `skills/` recursively (all nested files and directories) alongside `procedures/`, `samples/` and `assets/`, and the hydrated package payload MUST expose them. Hydration MUST remain atomic and write-once.

#### Scenario: Nested skill files are hydrated
- GIVEN a remote `video` package whose `skills/nn-video-script/` contains nested folders (`scripts/lib/`, `test/fixtures/`)
- WHEN `innfo-mcp` hydrates the package
- THEN every nested file is present under `specs/bluepriNNts/video/<version>/skills/nn-video-script/`
- AND the directory appears only after the full fetch completes

### Requirement: Flat Installed bluepriNNt Resolves By Name

A bluepriNNt installed flat at `~/.agents/bluepriNNts/<name>/` (no version directory) MUST resolve by name through the template resolver, including its `procedures/` and `skills/` folders.

#### Scenario: Flat install resolves
- GIVEN `video` installed flat at `~/.agents/bluepriNNts/video/` and absent from workspace and cache tiers
- WHEN the resolver resolves `video`
- THEN it returns the flat install directory
- AND `skills/nn-video-script/` is reachable beneath it
