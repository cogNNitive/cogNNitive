# Template Package Structure Specification (delta)

## MODIFIED Requirements

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

## ADDED Requirements

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
