# Delta Spec: skills-lifecycle-state-file-doc-fix

This delta spec corrects one stale file-path claim in
`skills/nn-skills-lifecycle/SKILL.md`. It does not change any runtime
behavior, does not rename or move any actual state file, and does not touch
`skills-state.json`'s role as the legacy migration source.

## ADDED Requirements

### Requirement: `nn-skills-lifecycle/SKILL.md` names the correct installed-state file

`skills/nn-skills-lifecycle/SKILL.md` MUST document the installed-state file
as `~/.agents/bootstrap-state.json`, matching
`DEFAULT_STATE_FILE` in `preflight-check.js` and `skills-commands.js`. It
MUST NOT continue to document `~/.agents/skills-state.json` as the current
state file.

#### Scenario: A reader is pointed at the file the tooling actually reads and writes

- **GIVEN** `skills/nn-skills-lifecycle/SKILL.md` after this change
- **WHEN** a reader looks up which file records installed skill/template/MCP
  state
- **THEN** the documented path SHALL be `~/.agents/bootstrap-state.json`
- **AND** it SHALL match the `DEFAULT_STATE_FILE` value used by
  `preflight-check.js` and `scripts/lib/skills-commands.js`.

#### Scenario: The legacy migration source is not misrepresented as current

- **GIVEN** `~/.agents/skills-state.json`'s actual role as a one-time legacy
  migration source
- **WHEN** the corrected documentation mentions it, if at all
- **THEN** it SHALL NOT be described as the file currently read or written
  by installs, updates, or `preflight-check.js`'s audit.
