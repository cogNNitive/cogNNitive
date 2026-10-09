# Delta for Router Governance & Session Entrypoint Alignment

## MODIFIED Requirements

### Requirement: Front Controller Activation via Workspace AGENTS.md

`nn` MUST serve as the canonical entrypoint triggered by the `AGENTS.md`
"Session Start" directive across all supported AI coding agents. When invoked
during session start, `nn` MUST execute the environment readiness checks
(`nn-preflight`), verify Node.js and MCP runtime health, probe domain state, and
present the entry job menu `[s][m][r][p][h][x]`. The canonical triggers are
`nn` and `/nn`; stale aliases such as `/nn-start` MUST NOT be referenced.
(Previously: stated canonical activation but did not pin the trigger aliases or forbid the removed `/nn-start`.)

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

#### Scenario: Removed alias is not advertised
- GIVEN the shipped `nn` routing copy
- WHEN inspected for trigger aliases
- THEN `nn` and `/nn` are present and `/nn-start` does not appear

### Requirement: Consistent Agent UX & Governance Compliance

All agent sessions bootstrapped via `AGENTS.md` and routed through `nn` MUST
enforce the cogNNitive UX protocol:
1. **Zero Unilateral Mutation (Consent First)**: No renaming or restructuring of user files without explicit consent.
2. **Recommended Option First**: Mark default recommendation with `(Recommended)` based on domain probe state.
3. **Conversations as Reference & Source**: Allocate turn logging in `conversations/` silently and auto-promote at close (opt-out with `[none]`).
4. **Optimistic Execution & Reversibility**: Proceed immediately on safe, standard actions without redundant blocking confirmations.

These governance rules MUST be sourced from the generated shared-rules block
(`skill-shared-rules`) rather than restated per skill, and MUST be identical
across `nn`, `nn-innfo`, and `nn-trannsform`.
(Previously: the four rules were restated by hand in each skill and had begun to diverge.)

#### Scenario: Agent follows UX governance during session
- GIVEN an active session initiated via `AGENTS.md` and `nn`
- WHEN the agent presents choices or executes standard workspace operations
- THEN the agent leads with `(Recommended)` for standard defaults and applies optimistic execution for reversible actions

#### Scenario: Governance wording is uniform across skills
- GIVEN the generated blocks in `nn`, `nn-innfo`, and `nn-trannsform`
- WHEN the four governance rules are compared
- THEN they are identical and traceable to the shared source
