# Proposal: Workspace AGENTS.md Router Bootstrap

## Intent

When bootstrapping a new workspace or running `bootstrapProject`, scaffold an `AGENTS.md` file in the workspace root containing a mandatory "Session Start: Load nn-router" directive (supporting dedicated vs hybrid workspace modes, defaulting to dedicated as recommended). Update `nn-router` and `nn-trannsform` specifications and logic so AI coding agents automatically trigger `nn-router` at session start in user workspaces.

## Scope

### In Scope
- **Scaffolding**: Update `bootstrapProject` in `skills/nn-trannsform/scripts/lib/bootstrap.js` to scaffold `AGENTS.md` at workspace root with a session start directive invoking `nn-router`.
- **Mode Support**: Support dedicated workspace (default, recommended) and hybrid workspace configuration flags for AGENTS instructions.
- **Documentation & Specs**: Update `skills/nn-router/SKILL.md` and `skills/nn-trannsform/SKILL.md` to document workspace agent session initialization conventions.
- **Testing**: Add and update unit tests for `bootstrapProject` verifying `AGENTS.md` creation and content.
- **Integrity**: Validate workspace and skill integrity tests pass.

### Out of Scope
- Modifying non-bootstrap ingestion or conversion routines.
- Overwriting existing custom `AGENTS.md` without safety guards.

## Capabilities

### Modified Capabilities
- `bootstrap-workflow`: Workspace initialization scaffolds root `AGENTS.md` with router activation instructions.
- `router-governance`: Standardizes agent entrypoint triggering `nn-router` across dedicated and hybrid workspaces.

## Approach

1. **Scaffold Generator**: Extend `bootstrapProject` in `skills/nn-trannsform/scripts/lib/bootstrap.js` to generate `AGENTS.md` if not present.
2. **Session Start Directive**: Include explicit rules in generated `AGENTS.md` directing AI agents (Cursor, Claude Code, OpenCode, Codex) to execute `nn-router` activation gate on session start.
3. **Spec Alignment**: Document AGENTS bootstrap guidelines in `skills/nn-router/SKILL.md` and `skills/nn-trannsform/SKILL.md`.
4. **Unit Tests**: Enhance `test-bootstrap-recursive.js` (and dedicated bootstrap test suites) to verify `AGENTS.md` presence, default mode (dedicated), and option overrides.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-trannsform/scripts/lib/bootstrap.js` | Modified | Add `AGENTS.md` scaffolding with session start nn-router directive |
| `skills/nn-router/SKILL.md` | Modified | Document agent session entrypoint convention and workspace modes |
| `skills/nn-trannsform/SKILL.md` | Modified | Update bootstrap flow documentation |
| `skills/nn-trannsform/test/unit/test-bootstrap-recursive.js` | Modified | Add unit assertions for `AGENTS.md` scaffolding |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Overwriting existing user `AGENTS.md` | Low | Only create `AGENTS.md` if it does not already exist or when initializing fresh project |
| Agent directive ambiguity | Low | Provide structured, clear Session Start instructions for common agent runners |

## Rollback Plan

Revert modified files in `skills/nn-trannsform/` and `skills/nn-router/` via git checkout.

## Dependencies

- None

## Success Criteria

- [ ] `bootstrapProject` generates `AGENTS.md` in workspace root containing mandatory `nn-router` session start instructions.
- [ ] Supports dedicated workspace mode by default, with hybrid mode option.
- [ ] `skills/nn-router/SKILL.md` and `skills/nn-trannsform/SKILL.md` reflect updated bootstrap specifications.
- [ ] Unit tests in `skills/nn-trannsform` pass.
- [ ] Repository integrity tests pass.
