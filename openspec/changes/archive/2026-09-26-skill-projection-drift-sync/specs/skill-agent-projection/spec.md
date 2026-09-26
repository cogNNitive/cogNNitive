# Delta Spec: skill-agent-projection

This delta spec defines the requirements for keeping AI agent editor projections (`~/.claude/skills/`, `~/.config/opencode/skills/`, `~/.gemini/config/skills/`) synchronized with canonical skills (`~/.agents/skills/`), recording ownership in `bootstrap-state.json`, and supporting safe mirror copy semantics.

## ADDED Requirements

### Requirement: Re-project skills during update, install, and bootstrap
`cmdUpdate`, `cmdInstall`, and `cmdBootstrap` in `scripts/lib/skills-commands.js` MUST invoke `projectSkillsToAgents` for global scope operations, including when canonical skills are already up to date.

#### Scenario: cmdUpdate runs when canonical is up-to-date
- **GIVEN** canonical skills are already at their pinned commit in `bootstrap-state.json`
- **WHEN** `cmdUpdate` is executed
- **THEN** it SHALL NOT return early before invoking `projectSkillsToAgents`
- **AND** it SHALL re-project all installed canonical skills to the target editor agent directories.

#### Scenario: cmdInstall runs for missing skills
- **GIVEN** one or more skills are installed into the canonical directory
- **WHEN** `cmdInstall` completes canonical installation
- **THEN** it SHALL invoke `projectSkillsToAgents` to project the newly installed skills.

### Requirement: Ownership recording and preservation in bootstrap-state.json
`bootstrap-state.json` MUST track projected skills under the top-level `projections` key per agent and skill. `loadState` and `emptyState` in `scripts/lib/skills-commands.js` MUST preserve and round-trip the `projections` mapping.

#### Scenario: Preserving projections across load and save
- **GIVEN** a state file containing a `projections` object
- **WHEN** `loadState` reads the file and `saveState` persists state
- **THEN** the `projections` object SHALL be retained with all its nested agent and skill entries without data loss.

#### Scenario: Recording projection method and timestamp
- **GIVEN** a skill projection is created or adopted for an agent
- **WHEN** `projectSkillsToAgents` updates state
- **THEN** state `projections[agent].skills[skillName]` SHALL record `method` (`symlink` or `copy`), `source` (canonical absolute path), and `projected_at` (ISO timestamp).

### Requirement: Ownership table classification (ADR-2)
`classifyProjection` in `skills/nn-preflight/scripts/lib/projection.js` and `projectSkillsToAgents` MUST evaluate the destination path and ownership state before modifying or adopting projections.

#### Scenario: Destination does not exist
- **GIVEN** `dest` does not exist on disk
- **WHEN** `projectSkillsToAgents` projects a skill
- **THEN** it SHALL attempt to create a symlink (or junction on win32)
- **AND** if symlink creation fails, it SHALL fall back to `mirrorDir` copy
- **AND** it SHALL record the projection in state.

#### Scenario: Destination is an existing symlink pointing to canonical src
- **GIVEN** `dest` is a symlink pointing to the canonical `src` directory
- **WHEN** `projectSkillsToAgents` executes
- **THEN** it SHALL adopt the projection and record it in state as `symlink`.

#### Scenario: Destination is a dangling or foreign link already recorded
- **GIVEN** `dest` is a symlink pointing to an invalid or non-canonical path
- **AND** the entry is recorded in `bootstrap-state.json` under `projections`
- **WHEN** `projectSkillsToAgents` executes
- **THEN** it SHALL remove the link (non-recursively) and recreate the projection.

#### Scenario: Destination is a dangling or foreign link not recorded
- **GIVEN** `dest` is a symlink pointing to an invalid or non-canonical path
- **AND** the entry is NOT recorded in `bootstrap-state.json`
- **WHEN** `projectSkillsToAgents` executes
- **THEN** it SHALL NOT overwrite or delete the link
- **AND** it SHALL log an unmanaged warning and skip it.

#### Scenario: Destination is a real directory already recorded as copy
- **GIVEN** `dest` is a directory recorded in `projections` as `copy`
- **WHEN** `projectSkillsToAgents` executes
- **THEN** it SHALL mirror the canonical directory using `mirrorDir`.

#### Scenario: Destination is an unrecorded real directory matching canonical content
- **GIVEN** `dest` is an unrecorded directory whose projectable content hash matches canonical `src`
- **WHEN** `projectSkillsToAgents` executes
- **THEN** it SHALL adopt the directory and record it in state as `copy`.

#### Scenario: Destination is an unrecorded real directory differing from canonical content
- **GIVEN** `dest` is an unrecorded directory whose projectable content hash differs from canonical `src`
- **WHEN** `projectSkillsToAgents` executes
- **THEN** it SHALL NOT overwrite or delete the directory
- **AND** it SHALL log an unmanaged warning and skip it.

### Requirement: Workspace scope skips projection
Running commands with `--scope workspace` MUST NOT project skills into global editor directories and MUST print an informational notice.

#### Scenario: Bootstrap or update with workspace scope
- **GIVEN** `--scope workspace` is passed to `skills-manager.js`
- **WHEN** `cmdBootstrap`, `cmdInstall`, or `cmdUpdate` executes
- **THEN** `skills-manager.js` SHALL pass `scope: 'workspace'` through `resolvedArgs`
- **AND** projection to global editor directories SHALL be skipped with an explanatory console notice.

### Requirement: Mirror directory helper (`mirrorDir`)
`scripts/lib/atomic-fs.js` MUST export `mirrorDir(src, dest, isIncluded)` which mirrors included entries, removes included orphan entries in `dest`, and preserves excluded entries.

#### Scenario: Mirroring removes orphan included files
- **GIVEN** `dest` contains an included file `orphan.md` not present in `src`
- **WHEN** `mirrorDir(src, dest, isProjectableName)` executes
- **THEN** `orphan.md` SHALL be removed from `dest`.

#### Scenario: Mirroring preserves excluded files and directories
- **GIVEN** `dest` contains an excluded file or directory (such as `.git` or `node_modules`)
- **WHEN** `mirrorDir(src, dest, isProjectableName)` executes
- **THEN** the excluded file or directory in `dest` SHALL be preserved untouched.
