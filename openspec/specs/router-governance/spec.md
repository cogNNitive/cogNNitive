# Router Governance & Session Entrypoint Alignment

## Purpose

Align the `nn` front controller and ecosystem governance rules with standardized workspace agent entrypoints (`AGENTS.md`), ensuring deterministic activation gate checks, state-driven job recommendations, consistent session start protocols, and uniform routing across all cogNNitive workspaces.
## Requirements
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

---

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

---

### Requirement: Procedure Routing and Precedence

The `nn` front controller MUST route any intent to run a procedure to the
procedure-execution owner skill, and MUST resolve procedure names by precedence
model > blueprint > domain > workspace. `nn` MUST NOT contain the execution steps
itself.

#### Scenario: Intent routed to the owner

- GIVEN a user asks `nn` to run a procedure
- WHEN `nn` handles the intent
- THEN `nn` activates the owner skill's procedure-execution protocol
- AND does not execute steps from its own text

#### Scenario: Precedence applied at routing

- GIVEN a procedure name present in both the active model and the domain blueprint
- WHEN `nn` routes the intent
- THEN the model definition takes precedence

#### Scenario: Ambiguous name across all sources

- GIVEN the same procedure name in model, blueprint, domain, and `workspace/procedures/`
- WHEN `nn` resolves it
- THEN the model definition MUST be selected

#### Scenario: No procedure found

- GIVEN an intent naming a procedure that no source declares
- WHEN `nn` attempts to resolve it
- THEN `nn` MUST report that the procedure is unknown and MUST NOT invent one

### Requirement: Watch-root state drives the Sources sub-option

The `nn` front controller MUST read the `watch_roots.declared` count from the domain probe. When `declared > 0`, `[s] Sources` MUST offer a sub-option to run the external watch-root scan and the session-start digest. When `declared === 0`, `[s] Sources` MUST offer an option to declare a watch root. This surfacing MUST be contextual — it MUST NOT add a new top-level menu letter, and it MUST NOT change the `[s][m][r][p][h][x]` shape or the `(Recommended)` selection.

#### Scenario: Declared roots offer the scan
- GIVEN a workspace whose probe reports `watch_roots.declared > 0`
- WHEN `nn` presents the entry menu
- THEN `[s] Sources` offers a sub-option to scan external watch roots
- AND the top-level menu letters are unchanged

#### Scenario: No roots offer declaration
- GIVEN a workspace whose probe reports `watch_roots.declared === 0`
- WHEN `nn` presents the entry menu
- THEN `[s] Sources` offers an option to declare a watch root
- AND no scan is offered

#### Scenario: Surfacing never blocks
- GIVEN a probe that omits `watch_roots` (older preflight)
- WHEN `nn` presents the entry menu
- THEN `nn` treats the count as `0` and presents the menu unchanged

### Requirement: Help surfaces the watched-folders capability

`[h] Help` MUST list the external watch-roots capability so a user with no declared roots can still discover it. The entry MUST describe it as watching external folders without a daemon (declarative roots, on-demand scan, session-start digest).

#### Scenario: Help lists the capability
- GIVEN any workspace
- WHEN the user opens `[h] Help`
- THEN a watched-folders capability entry is listed
- AND it states that no daemon or background process is used

### Requirement: Session start offers the read-only watch digest

When the domain probe reports `watch_roots.declared > 0`, `nn` MUST invoke the read-only `--watch-digest` at session start and present the pending items for a per-item decision (`ignore` / `postpone` / `import`). The digest MUST NOT be invoked when `declared === 0`. Producing the digest MUST NOT write to `sources/` and MUST NOT block the session if it fails or is unavailable; a failure MUST be swallowed and the session MUST proceed to the menu.

#### Scenario: Digest is offered when roots exist
- GIVEN a workspace whose probe reports `watch_roots.declared > 0`
- WHEN `nn` completes the activation gate
- THEN `nn` runs `--watch-digest`
- AND presents any pending items with `ignore`/`postpone`/`import` decisions

#### Scenario: Digest is skipped without roots
- GIVEN a workspace whose probe reports `watch_roots.declared === 0`
- WHEN `nn` completes the activation gate
- THEN `--watch-digest` is not invoked

#### Scenario: Digest failure does not block
- GIVEN a workspace whose probe reports `watch_roots.declared > 0`
- WHEN the digest command fails or is unavailable
- THEN `nn` swallows the error and proceeds to the entry menu

