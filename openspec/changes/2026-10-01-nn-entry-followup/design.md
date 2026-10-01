# Design: Consolidated /nn Entry-Flow Follow-up & Defect Remediation

## 1. Architectural Architecture & Design Decisions

### D1. Single Front Controller & Automatic Workspace Activation
- **Decision:** Delete `nn-start` and standardize on `nn` (`skills/nn/SKILL.md`) as the ecosystem's sole Front Controller.
- **Mechanism:** Workspaces bootstrapped via `nn-trannsform` (`bootstrap.js`) scaffold an `AGENTS.md` containing `## Session Start: Load nn (MANDATORY)`. AI agents opening the workspace auto-trigger `nn` on Turn 1, running the probe and presenting the Job Loop Menu (`[s][m][r][p]`) without manual typing.

### D2. Deterministic State Probe & Pending Source Semantics
- **Decision:** The domain state probe computes `sources.pending_count` by scanning `sources/import/` (and fallback `sources/original/`) and comparing each file's sha256 against the recorded hash in its normalized `sources/nn/` counterpart.
- **Semantics:** If all raw files are normalized and hash-identical, `pending_count` is `0`. Once `pending_count === 0`, `[s]` yields recommendation to `[m]` (or `[r]`/`[p]`).
- **Preflight Warning Handling:** Warnings in preflight checks (`exitCode === 1`, items with status `unnormalized`, `stale`, `upgrade-available`, `warning`, `blocker`) are captured cleanly from `runCheck`'s `results.items` and formatted into `preflight.warnings`. Warnings do not halt the session; they display an informative banner and continue to the menu.
- **Latency & Offline Default:** The session-start probe runs with `offline: true` (or `--skip-preflight` / bounded local checks) to guarantee instant execution (<100ms) without serial remote HTTP requests blocking user interaction.

### D3. MCP Server Legacy Interceptor Resilience
- **Decision:** Allow read-only diagnostic and introspection tools (specifically `check_domain`, `validate_knowledge_url`, `get_spec`, `list_blueprints`) to execute on `mixed` and legacy domains.
- **Mechanism:** Modify `checkDomainLegacy` in `server.ts` to allow diagnostic inspection while gating mutating operations (`apply_change`, `init_knowledge`, `hydrate_blueprint`, `sync_domain_manifest`) until `nn-upgrade` is completed.

### D4. Comprehensive Migration for Specs/Templates
- **Decision:** `skills/nn-upgrade/scripts/migrate-domain.js` moves legacy `specs/templates/` to canonical `specs/bluepriNNts/`, ensuring that migrated workspaces reach full `current` layout status and are not left stranded in `mixed`.

### D5. MCP Contract Guard Expansion
- **Decision:** Enhance `scripts/skill-mcp-contract.test.mjs` to validate all referenced MCP tool names across `skills/`, `_samples_nn/`, and runtime codebase against `server.ts` registry, while exempting historical immutable specs (`_V_`) and `openspec/backlog.md`.

## 2. Component Design & Interfaces

### Component A: Domain State Probe (`domain-probe.js`)
```typescript
interface DomainProbeResult {
  version: '1.0.0';
  layout: 'current' | 'legacy' | 'mixed' | 'unknown';
  preflight: {
    status: 'ok' | 'warning' | 'error';
    exitCode: number;
    warnings: Array<{ name: string; type: string; status: string; detail?: string }>;
  };
  sources: {
    pending_count: number;
    unnormalized_count: number;
    stale_count: number;
  };
  knowledge: {
    count: number;
    items: string[];
  };
  procedures: {
    domain_count: number;
    blueprint_count: number;
  };
}
```

### Component B: Runtime Hint Alignment in `validate.ts`
When local template cache staleness is detected, `validate.ts` emits:
```typescript
message: `[TEMPLATE_CACHE_STALE] Local template cache for "${freshness.name}" differs from canonical remote "${freshness.url}". Run check_domain or hydrate_blueprint to update the template cache and re-validate.`
promptHint: `Run check_domain or hydrate_blueprint to update the template cache with canonical remote version "${freshness.url}" and re-validate the model.`
```

### Component C: AGENTS.md Template in `bootstrap.js`
```markdown
# AGENTS.md — ${projectName}

## Session Start: Load nn (MANDATORY)

At the beginning of every interactive session in this workspace, AI coding agents (Cursor, Claude Code, OpenCode, Codex, Antigravity) **MUST** immediately load and execute **`nn`** (`skills/nn/SKILL.md` or `/nn`).

### Session Start Protocol
1. **Activation Gate & Environment Readiness**: Trigger `nn` to run the domain state probe (`domain-probe.js`) and inspect workspace layout and readiness.
2. **Session Transcript Allocation**: Silently allocate or attach turn logging under `conversations/YYYY-MM-DD_HHmmss.md` to preserve context.
3. **Job Navigation**: Present the Job Loop Navigation Menu (`[s] Sources`, `[m] Model`, `[r] Review/Deliverables`, `[p] Procedures`).
```

## 3. Risk Mitigation & Verification Strategy
- **Regression Net:** Run targeted test suites (`domain-probe.test.js`, `freshness-warning.test.ts`, `skill-mcp-contract.test.mjs`, `test-bootstrap-recursive.js`, `migrate-domain.test.js`).
- **No Working Tree Bleed:** Never stage foreign paths from concurrent agent sessions. Use explicit path staging.
