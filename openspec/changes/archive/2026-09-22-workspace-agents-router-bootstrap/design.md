# Technical Design: Workspace AGENTS.md Router Bootstrap

## Context & Problem
When creating or bootstrapping a new cogNNitive workspace via `bootstrapProject` (`nn-trannsform`), no `AGENTS.md` instructions file is created at the workspace root. Without explicit instructions, AI coding agents (Cursor, Claude Code, OpenCode, Codex) lack automatic guidance to invoke `nn-router` (Front Controller & Preflight Gate) at session start. This leads to skipped environment checks, bypassed UX governance, and uncoordinated skill execution.

## Goals & Non-Goals
- **Goals**:
  - Automatically scaffold `AGENTS.md` in the workspace root during `bootstrapProject`.
  - Include a mandatory Session Start directive requiring AI agents to load and invoke `nn-router`.
  - Support **dedicated** workspace mode (default & recommended) and **hybrid** workspace mode.
  - Preserve existing `AGENTS.md` files without destructive overwrites.
  - Align `nn-router` and `nn-trannsform` skill specifications and expand unit tests.
- **Non-Goals**:
  - Overwrite or mutate custom `AGENTS.md` files already present.
  - Modify non-bootstrap ingestion or conversion routines.

## Design Decisions

### 1. AGENTS.md Template Content & Modes
The scaffolded `AGENTS.md` contains a structured Session Start directive:
- **Dedicated Mode (`dedicated`, default/recommended)**: Declares the workspace as a dedicated cogNNitive environment where `nn-router` governs session lifecycle, preflight readiness, conversation logging, and skill routing.
- **Hybrid Mode (`hybrid`)**: Clarifies that cogNNitive operates alongside external project artifacts (e.g., embedded repo), scoping `nn-router` governance to cogNNitive directories (`models/`, `sources/`, `procedures/`, `export/`, `conversations/`).

### 2. `bootstrapProject` API Signature
Extend `bootstrapProject` in `skills/nn-trannsform/scripts/lib/bootstrap.js`:
```js
function bootstrapProject(srcDir, destParentDir, projectName, options = {})
```
- `options.workspaceMode`: `'dedicated'` (default) or `'hybrid'`.
- `options.overwriteAgents`: `false` by default. If `AGENTS.md` already exists, it is untouched.
- Return object includes `agentsMdPath` along with existing properties (`projectDir`, `importDir`, `copiedCount`, `provModelPath`).

## Component Changes

### 1. `skills/nn-trannsform/scripts/lib/bootstrap.js`
- Add `generateAgentsMd(projectName, mode)` returning the standard Markdown template with `## Session Start: Load nn-router (MANDATORY)` directive.
- Check for existing `AGENTS.md` at `path.join(projectDir, 'AGENTS.md')`. Write file if missing.
- Return `agentsMdPath` in the result object.

### 2. `skills/nn-router/SKILL.md`
- Document the workspace `AGENTS.md` contract under Activation Gate & System Governance.
- Document dedicated vs. hybrid workspace mode routing behavior.

### 3. `skills/nn-trannsform/SKILL.md`
- Update Section 1 (Project Initialization & Bootstrap) layout diagram and interaction flow to include `AGENTS.md` scaffolding.

### 4. `skills/nn-trannsform/test/unit/test-bootstrap-recursive.js`
- Verify default bootstrap creates `AGENTS.md` with dedicated mode directive.
- Verify `options.workspaceMode = 'hybrid'` creates hybrid instructions.
- Verify existing `AGENTS.md` is preserved on re-bootstrap.

## Migration & Compatibility
- **New Workspaces**: Receive `AGENTS.md` automatically upon initialization.
- **Existing Workspaces**: Untouched; existing `AGENTS.md` files are never overwritten.
- **Backward Compatibility**: Calling `bootstrapProject(src, dest, name)` without `options` maintains full backward compatibility and defaults to dedicated mode.

## Verification Plan
1. **Unit Tests**: Run `node skills/nn-trannsform/test/unit/test-bootstrap-recursive.js` and `node skills/nn-trannsform/test/run.js`.
2. **Repo Verification**: Run repo-level integrity checks to ensure zero regressions across skill manifests.
