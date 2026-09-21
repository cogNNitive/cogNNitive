# Delta Spec: untrack-skill-registry (F3)

This delta spec untracks a machine-generated file and documents its
regeneration. It does not patch, wrap, or post-process `gentle-ai` output,
and it does not commit a sanitized or path-relativized copy.

## ADDED Requirements

### Requirement: `.atl/skill-registry.md` is untracked and ignored

The repository MUST stop tracking `.atl/skill-registry.md` in git while
leaving it present and readable on disk for local tooling.

#### Scenario: The file is removed from git tracking

- **GIVEN** the repository before this change, where
  `.atl/skill-registry.md` is a tracked file with absolute local paths
- **WHEN** this change is applied
- **THEN** `.atl/skill-registry.md` SHALL be removed from git's index via
  `git rm --cached`
- **AND** the file SHALL remain on disk, unchanged in content, after the
  removal.

#### Scenario: The file is gitignored going forward

- **GIVEN** `.gitignore` after this change
- **WHEN** `.atl/skill-registry.md` is regenerated locally (with different
  absolute paths on a different machine)
- **THEN** `git status` SHALL NOT report it as an untracked or modified file
- **AND** it SHALL NOT appear in any future diff.

### Requirement: Regeneration is documented where delegators already look

The one-command regeneration path MUST be documented in the location the
orchestrator protocol's skill-resolution step already directs readers to.

#### Scenario: A reader can find how to regenerate the registry

- **GIVEN** a contributor or delegating agent who needs
  `.atl/skill-registry.md` and finds it absent or stale
- **WHEN** they consult the documented skill-resolution fallback path
- **THEN** they SHALL find the exact command to regenerate the file locally
  (the `gentle-ai` skill-registry refresh invocation).

### Requirement: Skill-path injection is unaffected by untracking

Untracking the file MUST NOT change how subagent skill-path injection
resolves skills.

#### Scenario: Local filesystem reads still work

- **GIVEN** `.atl/skill-registry.md` present on disk but untracked
- **WHEN** a process reads it directly from the local filesystem as a
  fallback source
- **THEN** the read SHALL succeed identically to when the file was tracked,
  because git tracking state does not affect filesystem readability.

#### Scenario: Engram remains the primary source

- **GIVEN** the orchestrator protocol's documented resolution order (engram
  `skill-registry` lookup primary, local file fallback)
- **WHEN** this change is applied
- **THEN** that resolution order SHALL remain unchanged
- **AND** this change SHALL NOT alter the registry's content or contract.
