# Template Package Structure & Local Cache (delta)

## MODIFIED Requirements

### Requirement: Canonical Source Layout (repository `main`)

Template packages in the source repository MUST use canonical unversioned filenames
under `iNNfo/specs/bluepriNNts/<template-name>/`:
- The primary Level 2 specification MUST be named `spec_NN.md` (the root workspace template is `workspace_spec_NN.md`).
- `procedures/`, `samples/`, and `assets/` MUST also use unversioned filenames.
- A package MAY embed agent skills as `skills/<skill-name>/SKILL.md`, together with that skill's own scripts, references, tests and vendored data. An embedded skill is part of the package and MUST be versioned only through the package `blueprint_version`/`template_version`.
- Source paths MUST NOT encode a semantic version. The authoritative version MUST be declared in frontmatter as `template_version`.
(Previously: the embedding skill scenario named the `video` package.)

#### Scenario: Package embeds a full skill
- GIVEN the `video-script` package containing `skills/nn-video-script/SKILL.md` plus its `scripts/` and `test/` folders
- WHEN the package layout is inspected
- THEN the skill folder is treated as package content with no versioned path segment

### Requirement: Remote Hydration Includes Embedded Skills

Remote hydration of a package MUST fetch `skills/` recursively (all nested files and directories) alongside `procedures/`, `samples/` and `assets/`, and the hydrated package payload MUST expose them. Hydration MUST remain atomic and write-once.

#### Scenario: Nested skill files are hydrated
- GIVEN a remote `video-script` package whose `skills/nn-video-script/` contains nested folders (`scripts/lib/`, `test/fixtures/`)
- WHEN `innfo-mcp` hydrates the package
- THEN every nested file is present under `specs/bluepriNNts/video-script/<version>/skills/nn-video-script/`
- AND the directory appears only after the full fetch completes

### Requirement: Flat Installed bluepriNNt Resolves By Name

A bluepriNNt installed flat at `~/.agents/bluepriNNts/<name>/` (no version directory) MUST resolve by name through the template resolver, including its `procedures/` and `skills/` folders.

#### Scenario: Flat install resolves
- GIVEN `video-script` installed flat at `~/.agents/bluepriNNts/video-script/` and absent from workspace and cache tiers
- WHEN the resolver resolves `video-script`
- THEN it returns the flat install directory
- AND `skills/nn-video-script/` is reachable beneath it
