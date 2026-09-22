# Bootstrap Workflow & AGENTS.md Scaffolding

## Purpose

Standardize the workspace bootstrap process to automatically scaffold an `AGENTS.md` instruction file at the workspace root, establishing a mandatory "Session Start: Load nn-router" entrypoint for AI coding agents with configurable dedicated vs hybrid workspace modes.

## Requirements

### Requirement: Root AGENTS.md Scaffolding on Workspace Bootstrap

When initializing a new workspace via `bootstrapProject` (or `nn-trannsform` bootstrap workflow), the system MUST generate an `AGENTS.md` file at the root of the project directory if one does not already exist. The generated `AGENTS.md` MUST contain explicit directives instructing any AI coding agent (e.g., Cursor, Claude Code, OpenCode, Codex) to immediately load and execute `nn-router` upon starting an interactive session.

#### Scenario: Fresh workspace bootstrap generates AGENTS.md with router entrypoint
- GIVEN a destination directory for a new workspace
- WHEN `bootstrapProject` is invoked with valid project parameters
- THEN `AGENTS.md` is created at the workspace root
- AND `AGENTS.md` includes the mandatory "Session Start: Load nn-router" directive referencing `skills/nn-router/SKILL.md` (or `/nn-router`)

#### Scenario: Existing custom AGENTS.md is preserved
- GIVEN a project directory already containing an existing `AGENTS.md`
- WHEN `bootstrapProject` is run on that directory without overwrite flags
- THEN the existing `AGENTS.md` is preserved intact without mutation

---

### Requirement: Dedicated vs Hybrid Workspace Mode Configuration

The scaffolding generator MUST support configurable workspace modes, defaulting to `dedicated` mode as recommended, with support for `hybrid` mode.

1. **Dedicated Mode (`mode: dedicated`, default & recommended)**:
   - Instructs agents that the repository is a pure cogNNitive workspace.
   - All interactive tasks, document imports, model authoring, and conversation logs MUST adhere strictly to standard cogNNitive protocols (`sources/`, `models/`, `procedures/`, `conversations/`).
2. **Hybrid Mode (`mode: hybrid`)**:
   - Instructs agents that cogNNitive operates alongside an existing host codebase or documentation repository.
   - Agents MUST trigger `nn-router` when handling cogNNitive assets, specifications, and workflows while respecting host repository structure and conventions.

#### Scenario: Default scaffolding in dedicated mode
- GIVEN a bootstrap request with no explicit mode parameter or `mode: "dedicated"`
- WHEN `bootstrapProject` scaffolds `AGENTS.md`
- THEN `AGENTS.md` contains dedicated mode instructions designating the workspace as a primary cogNNitive environment
- AND `AGENTS.md` notes dedicated mode as the recommended default

#### Scenario: Scaffolding with hybrid mode configuration
- GIVEN a bootstrap request specifying `mode: "hybrid"` (or `--hybrid` CLI flag)
- WHEN `bootstrapProject` scaffolds `AGENTS.md`
- THEN `AGENTS.md` contains hybrid mode instructions detailing coexistence with host codebase conventions while routing cogNNitive tasks to `nn-router`

---

### Requirement: Structured Session Start Directive Format

The generated `AGENTS.md` MUST follow a structured, deterministic format easily parsed by AI coding agents. It MUST include:
- A prominent session initialization directive (e.g., `# Session Start`).
- Mandatory instruction to load `nn-router` (running `nn-preflight` readiness checks).
- Workspace mode declaration (`dedicated` or `hybrid`).
- Core UX protocol summary (Conversations as Reference & Source Protocol, Optimistic Execution, Zero Unilateral Mutation).

#### Scenario: AI agent parses generated AGENTS.md on session startup
- GIVEN an AI coding agent starting a session in a bootstrapped workspace
- WHEN the agent reads `AGENTS.md`
- THEN the agent identifies the `Session Start` section and triggers `nn-router` activation gate before processing user commands
