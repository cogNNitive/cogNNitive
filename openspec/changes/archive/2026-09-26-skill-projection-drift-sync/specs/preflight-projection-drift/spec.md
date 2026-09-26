# Delta Spec: preflight-projection-drift

This delta spec defines the requirements for auditing AI agent editor projections in `skills/nn-preflight/scripts/preflight-check.js`, reporting projection drift statuses, and raising `ACTION_REQUIRED` (exit code 1).

## ADDED Requirements

### Requirement: Auditing recorded projections in preflight
`skills/nn-preflight/scripts/preflight-check.js` MUST audit recorded skill projections from `bootstrap-state.json` (`state.projections`) before external network/manifest operations, and MUST support injectable homedir / state file for testing.

#### Scenario: Preflight audits only recorded projections (ADR-2)
- **GIVEN** `bootstrap-state.json` contains a `projections` map with entries for one or more agents
- **WHEN** `preflight-check.js` executes
- **THEN** it SHALL audit only the recorded projection entries
- **AND** unmanaged/unrecorded directories or links SHALL NOT be flagged as drift.

#### Scenario: Preserving projections in preflight loadState
- **GIVEN** `preflight-check.js` reads `bootstrap-state.json`
- **WHEN** `loadState` parses the file
- **THEN** it SHALL return the `projections` map as part of the state object.

### Requirement: Projection drift classification and statuses
`preflight-check.js` and `projection.js` MUST evaluate each recorded projection against its canonical source and classify it into one of five statuses: `in-sync`, `stale`, `dangling`, `wrong-target`, or `missing`.

#### Scenario: Symlink matching canonical source
- **GIVEN** a recorded projection of method `symlink`
- **AND** the destination link resolves to the canonical `source` path
- **WHEN** preflight audits the projection
- **THEN** the status SHALL be `in-sync`.

#### Scenario: Symlink pointing to missing target
- **GIVEN** a recorded projection of method `symlink`
- **AND** the destination link resolves to a non-existent path
- **WHEN** preflight audits the projection
- **THEN** the status SHALL be `dangling`.

#### Scenario: Symlink pointing to non-canonical target
- **GIVEN** a recorded projection of method `symlink`
- **AND** the destination link resolves to a path different from `source`
- **WHEN** preflight audits the projection
- **THEN** the status SHALL be `wrong-target`.

#### Scenario: Copy matching canonical projectable content
- **GIVEN** a recorded projection of method `copy`
- **AND** `hashTree(dest, isProjectableName)` matches `hashTree(source, isProjectableName)`
- **WHEN** preflight audits the projection
- **THEN** the status SHALL be `in-sync`.

#### Scenario: Copy with modified or orphan projectable content
- **GIVEN** a recorded projection of method `copy`
- **AND** `hashTree(dest, isProjectableName)` differs from `hashTree(source, isProjectableName)`
- **WHEN** preflight audits the projection
- **THEN** the status SHALL be `stale`.

#### Scenario: Recorded projection absent on disk
- **GIVEN** a recorded projection in `bootstrap-state.json`
- **AND** the destination path does not exist on disk
- **WHEN** preflight audits the projection
- **THEN** the status SHALL be `missing`.

### Requirement: Preflight exit code and report formatting (ADR-1)
Any projection drift (`stale`, `dangling`, `wrong-target`, or `missing`) MUST cause preflight to report `ACTION_REQUIRED` and exit with code 1, including when running offline.

#### Scenario: Projection drift sets ACTION_REQUIRED and exit code 1
- **GIVEN** at least one recorded projection is classified as `stale`, `dangling`, `wrong-target`, or `missing`
- **WHEN** `preflight-check.js` completes
- **THEN** it SHALL include `skill-projection` items with the drift details
- **AND** the final report status SHALL be `ACTION_REQUIRED`
- **AND** the process exit code SHALL be `1`.

#### Scenario: All projections in-sync
- **GIVEN** all recorded projections are `in-sync` (and no other blocker exists)
- **WHEN** `preflight-check.js` completes
- **THEN** the projection audit SHALL NOT alter the exit code or prevent a clean report.

#### Scenario: No projections in state file
- **GIVEN** `bootstrap-state.json` does not contain a `projections` key
- **WHEN** `preflight-check.js` completes
- **THEN** no projection drift items SHALL be created and exit code SHALL NOT be affected.
