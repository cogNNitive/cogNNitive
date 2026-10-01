# Router Governance & Session Entrypoint Alignment

## Purpose

Align the `nn` front controller and ecosystem governance rules with standardized workspace agent entrypoints (`AGENTS.md`), ensuring deterministic activation gate checks, state-driven job recommendations, consistent session start protocols, and uniform routing across all cogNNitive workspaces.

## Requirements

### Requirement: Front Controller Activation via Workspace AGENTS.md

`nn` MUST serve as the canonical entrypoint triggered by the `AGENTS.md` "Session Start" directive across all supported AI coding agents. When invoked during session start, `nn` MUST execute the environment readiness checks (`nn-preflight`), verify Node.js and MCP runtime health, probe domain state, and present the entry job menu `[s][m][r][p][h][x]`.

#### Scenario: Agent invokes nn on session initialization
- GIVEN an AI agent reading `AGENTS.md` at session start
- WHEN the agent triggers `nn` (or `/nn`)
- THEN `nn` runs the activation gate via `nn-preflight`
- AND runs the domain state probe
- AND presents the state-driven entry menu with the calculated `(Recommended)` job

#### Scenario: Preflight warning during session start
- GIVEN an environment with non-blocking preflight warnings (exit 1)
- WHEN `nn` is loaded at session start
- THEN `nn` displays the warning banner non-blockingly and proceeds immediately to the job menu

---

### Requirement: Consistent Agent UX & Governance Compliance

All agent sessions bootstrapped via `AGENTS.md` and routed through `nn` MUST enforce the cogNNitive UX protocol:
1. **Zero Unilateral Mutation (Consent First)**: No renaming or restructuring of user files without explicit consent.
2. **Recommended Option First**: Mark default recommendation with `(Recommended)` based on domain probe state.
3. **Conversations as Reference & Source**: Allocate turn logging in `conversations/` silently and prompt for promotion at close.
4. **Optimistic Execution & Reversibility**: Proceed immediately on safe, standard actions without redundant blocking confirmations.

#### Scenario: Agent follows UX governance during session
- GIVEN an active session initiated via `AGENTS.md` and `nn`
- WHEN the agent presents choices or executes standard workspace operations
- THEN the agent leads with `(Recommended)` for standard defaults and applies optimistic execution for reversible actions
