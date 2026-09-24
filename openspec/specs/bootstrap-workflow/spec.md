# Bootstrap Workflow & AGENTS.md Scaffolding

## Purpose

Standardize the workspace bootstrap process to automatically scaffold an `AGENTS.md` instruction file at the workspace root, establishing a mandatory "Session Start: Load nn-start" entrypoint for AI coding agents across all standard cogNNitive workspaces.

## Requirements

### Requirement: Root AGENTS.md Scaffolding on Workspace Bootstrap

When initializing a new workspace via `bootstrapProject` (or `nn-trannsform` bootstrap workflow), the system MUST generate an `AGENTS.md` file at the root of the project directory if one does not already exist. The generated `AGENTS.md` MUST contain explicit directives instructing any AI coding agent (e.g., Cursor, Claude Code, OpenCode, Codex, Antigravity) to immediately load and execute `nn-start` upon starting an interactive session.

#### Scenario: Fresh workspace bootstrap generates AGENTS.md with router entrypoint
- GIVEN a destination directory for a new workspace
- WHEN `bootstrapProject` is invoked with valid project parameters
- THEN `AGENTS.md` is created at the workspace root
- AND `AGENTS.md` includes the mandatory "Session Start: Load nn-start" directive referencing `skills/nn-start/SKILL.md` (or `/nn-start`)

#### Scenario: Existing custom AGENTS.md is preserved
- GIVEN a project directory already containing an existing `AGENTS.md`
- WHEN `bootstrapProject` is run on that directory without overwrite flags
- THEN the existing `AGENTS.md` is preserved intact without mutation

---

### Requirement: Structured Session Start Directive Format

The generated `AGENTS.md` MUST follow a structured, deterministic format easily parsed by AI coding agents. It MUST include:
- A prominent session initialization directive (`## Session Start: Load nn-start (MANDATORY)`).
- Mandatory instruction to load `nn-start` (running `nn-preflight` readiness checks).
- Silent conversation transcript reservation (`conversations/YYYY-MM-DD_HHmmss.md`).
- Core UX protocol summary (Conversations as Reference & Source Protocol, Optimistic Execution, Zero Unilateral Mutation).

#### Scenario: AI agent parses generated AGENTS.md on session startup
- GIVEN an AI coding agent starting a session in a bootstrapped workspace
- WHEN the agent reads `AGENTS.md`
- THEN the agent identifies the `Session Start` section and triggers `nn-start` activation gate before processing user commands
