# Delta for video-folder-contract

Scope: the containment rule is redefined from "never above the Series folder" to "never
above the scope root", so upward resolution through the scope chain is allowed.

## MODIFIED Requirements

### Requirement: No-Upward-Escape Rule

A script's asset paths MUST NOT resolve above its scope root: the domaiNN root, or the
nearest `isolate` scope when one is in the chain. Paths MAY resolve into an ancestor scope
of the script (for example from a Video into its Series or into the domaiNN root) when the
resolved location is inside the scope root. Paths that climb outside the scope root, or
into a sibling scope's private folder, are invalid.
(Previously: asset paths MUST NOT resolve above the script's own Series folder, so
`../../assets/x.mp4` reaching a workspace-level folder was invalid.)

#### Scenario: In-scope asset path is accepted

- GIVEN a script referencing an asset inside its own video or series folder
- WHEN the folder-contract check runs
- THEN the reference is accepted

#### Scenario: Ancestor-scope asset path is accepted

- GIVEN a script in Series `X` referencing `../../assets/x.mp4` that resolves to `assets/x.mp4` inside the domaiNN root
- WHEN the folder-contract check runs
- THEN the reference is accepted

#### Scenario: Path above the scope root is rejected

- GIVEN a script referencing a path that resolves to a location above the domaiNN root
- WHEN the folder-contract check runs
- THEN the reference is rejected with an explicit escape violation

#### Scenario: Path beyond an isolate boundary is rejected

- GIVEN a Series scope with `isolate: true` and a script referencing an asset in the enclosing domaiNN root's `assets/`
- WHEN the folder-contract check runs
- THEN the reference is rejected with an explicit escape violation

#### Scenario: Sibling series folder is rejected

- GIVEN a script in Series `X` referencing a file under Series `Y`'s private folder
- WHEN the folder-contract check runs
- THEN the reference is rejected with an explicit escape violation

## Out of scope

Drift between `shared/` and `assets/` and the stale `video-production-hierarchy` spec are
deferred until Adoption A lands. See the proposal's Deferred table
(`openspec/changes/2026-10-28-contextual-resolution/proposal.md`).
