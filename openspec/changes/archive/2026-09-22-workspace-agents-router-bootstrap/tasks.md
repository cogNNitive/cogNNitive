# Tasks: Workspace AGENTS.md Router Bootstrap

## 1. Core Implementation

- [x] 1.1 Implement `generateAgentsMd(projectName, mode)` in `skills/nn-trannsform/scripts/lib/bootstrap.js` generating standard session start instructions for `nn-router`.
- [x] 1.2 Update `bootstrapProject(srcDir, destParentDir, projectName, options)` signature in `skills/nn-trannsform/scripts/lib/bootstrap.js` to accept `options.workspaceMode` (`'dedicated'` default vs `'hybrid'`) and `options.overwriteAgents` (`false` default).
- [x] 1.3 Scaffold `AGENTS.md` at workspace root during `bootstrapProject` when not present and return `agentsMdPath` in the return object.

## 2. Skill Specification Alignment

- [x] 2.1 Update `skills/nn-router/SKILL.md` with workspace `AGENTS.md` session entrypoint contract and dedicated vs hybrid mode routing rules.
- [x] 2.2 Update `skills/nn-trannsform/SKILL.md` (Project Initialization & Bootstrap section) documenting `AGENTS.md` creation and mode configuration options.

## 3. Tests & Verification

- [x] 3.1 Update `skills/nn-trannsform/test/unit/test-bootstrap-recursive.js` to assert `AGENTS.md` scaffolding under default dedicated mode, custom hybrid mode, and preservation of pre-existing `AGENTS.md`.
- [x] 3.2 Run unit test suite `node skills/nn-trannsform/test/run.js` and verify all tests pass.
- [x] 3.3 Run repository integrity and skill validation checks.
