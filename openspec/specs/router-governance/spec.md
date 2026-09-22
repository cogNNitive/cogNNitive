# Router Governance & Session Entrypoint Alignment

## Purpose

Align the `nn-router` front controller and ecosystem governance rules with standardized workspace agent entrypoints (`AGENTS.md`), ensuring deterministic activation gate checks, consistent session start protocols, and uniform routing across all cogNNitive workspaces.

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
