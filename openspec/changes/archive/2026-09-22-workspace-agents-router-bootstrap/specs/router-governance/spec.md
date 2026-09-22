# Router Governance & Session Entrypoint Alignment

## Purpose

Align the `nn-router` front controller and ecosystem governance rules with standardized workspace agent entrypoints (`AGENTS.md`), ensuring deterministic activation gate checks, consistent session start protocols, and mode-aware routing across dedicated and hybrid workspace environments.

## Requirements

### Requirement: Front Controller Activation via Workspace AGENTS.md

`nn-router` MUST serve as the canonical entrypoint triggered by the `AGENTS.md` "Session Start" directive across all supported AI coding agents. When invoked during session start, `nn-router` MUST execute the environment readiness checks (`nn-preflight`), verify Node.js and MCP runtime health, and initialize the conversational session logging protocol.

#### Scenario: Agent invokes nn-router on session initialization
- GIVEN an AI agent reading `AGENTS.md` at session start
- WHEN the agent triggers `nn-router` (or `/nn-router`)
- THEN `nn-router` runs the activation gate via `nn-preflight`
- AND creates or attaches the active conversation log under `conversations/`
- AND prepares the environment for specialized skill routing

#### Scenario: Preflight failure during session start
- GIVEN an environment missing required runtime dependencies (e.g. Node.js < 18 or inaccessible MCP server)
- WHEN `nn-router` is loaded at session start
- THEN `nn-router` halts standard routing and reports actionable remediation steps to the agent and user before proceeding

---

### Requirement: Mode-Aware Governance in Dedicated vs Hybrid Workspaces

`nn-router` MUST recognize and respect the workspace mode declared in `AGENTS.md` (`dedicated` or `hybrid`).

1. **Dedicated Workspace Governance**:
   - `nn-router` acts as the primary orchestrator for the entire workspace.
   - All standard folders (`sources/`, `models/`, `procedures/`, `conversations/`, `export/`) are managed under standard cogNNitive lifecycle protocols.
2. **Hybrid Workspace Governance**:
   - `nn-router` acts as an embedded subsystem orchestrator.
   - Non-destructive and scoped file access rules are enforced to avoid interference with host repository build pipelines, package configs, or non-cogNNitive folders.

#### Scenario: Dedicated workspace operations
- GIVEN a workspace with `AGENTS.md` configured in `dedicated` mode
- WHEN `nn-router` validates workspace layout
- THEN it verifies and enforces canonical layout across `sources/`, `models/`, and `conversations/` with standard cogNNitive governance

#### Scenario: Hybrid workspace operations
- GIVEN a workspace with `AGENTS.md` configured in `hybrid` mode
- WHEN `nn-router` processes user commands
- THEN it scopes model authoring, source transformation, and conversation archiving to cogNNitive paths while keeping host files untouched

---

### Requirement: Consistent Agent UX & Governance Compliance

All agent sessions bootstrapped via `AGENTS.md` and routed through `nn-router` MUST enforce the cogNNitive UX protocol:
1. **Zero Unilateral Mutation (Consent First)**: No renaming or restructuring of user files without explicit consent.
2. **Recommended Option First**: Mark default recommendation with `(Recommended)` as option `[1]` or `[a]`.
3. **Conversations as Reference & Source**: Allocate turn logging in `conversations/` silently and prompt for promotion at close.
4. **Optimistic Execution & Reversibility**: Proceed immediately on safe, standard actions without redundant blocking confirmations.

#### Scenario: Agent follows UX governance during session
- GIVEN an active session initiated via `AGENTS.md` and `nn-router`
- WHEN the agent presents choices or executes standard workspace operations
- THEN the agent leads with `(Recommended)` for standard defaults and applies optimistic execution for reversible actions
