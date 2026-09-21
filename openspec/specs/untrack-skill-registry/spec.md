# Spec: untrack-skill-registry

This spec records the requirement to untrack a machine-generated file and
document its regeneration. It does not patch, wrap, or post-process `gentle-ai`
output, and it does not commit a sanitized or path-relativized copy.

## Requirements

### Requirement: `.atl/skill-registry.md` is untracked

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

#### Scenario: The file no longer appears in diffs

- **GIVEN** `.atl/skill-registry.md` untracked and regenerated locally with
  different absolute paths on a different machine
- **WHEN** a contributor checks `git status`
- **THEN** the file SHALL NOT report as an untracked or modified file
- **AND** it SHALL NOT appear in any future diff, because `.gitignore:62`
  already contains the `.atl/` pattern that prevents the untracked file from
  being reported.

### Requirement: Regeneration is documented where delegators already look

The one-command regeneration path MUST be documented in the location the
orchestrator protocol's skill-resolution step already directs readers to.

#### Scenario: A reader can find how to regenerate the registry

- **GIVEN** a contributor or delegating agent who needs
  `.atl/skill-registry.md` and finds it absent or stale
- **WHEN** they consult the documented skill-resolution fallback path
  (orchestrator protocol directs to `AGENTS.md`)
- **THEN** they SHALL find the exact command to regenerate the file locally
  (the `gentle-ai skill-registry refresh --force` invocation).

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

## Design decisions

- No `.gitignore` edit is made. The pattern `.atl/` at `.gitignore:62`
  already covers this file (design ADR-008).
- The file remains on disk after `git rm --cached`, so local skill-path
  injection (which reads the filesystem) continues to work identically.
