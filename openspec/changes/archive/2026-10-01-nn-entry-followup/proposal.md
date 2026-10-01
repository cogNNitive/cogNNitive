# Proposal: Consolidated /nn Entry-Flow Follow-up & Defect Remediation

Status: proposed
Author: Senior Architect
Date: 2026-10-01
Origin: Consolidated follow-up to archived changes `2026-10-01-nn-entry-contract-repair`, `2026-10-01-nn-workspace-layout-canonical`, `2026-10-01-nn-domain-state-probe`, and `2026-10-01-nn-entry-job-menu` shipped in commit `6f905b1e`.

## 1. Intent & Context

A major overhaul of the `/nn` front controller, domain state probe, and canonical workspace layout was delivered in commit `6f905b1e`. While the core contracts were laid out, an audit revealed critical runtime defects, unhandled edge cases in layout detection, stale MCP tool references across living specs and documentation, and conflicting entrypoint governance.

This follow-up change systematically resolves all residual defects and completes the consolidation:
1. **Defect Remediation (P1–P5):** Fix runtime probe errors (preflight warning drops, `pending_count` semantics, uncapped latency, local repo path assumptions, and unannotated legacy fallbacks).
2. **MCP & Runtime Contract Repair:** Fix `validate.ts` runtime hints (`check_workspace` -> `check_domain` / `hydrate_blueprint`), align procedure file naming conventions, update shipped samples, and expand the contract drift guard.
3. **Canonical Workspace Layout & Gate Resilience:** Allow non-destructive diagnostic tools (`check_domain`) to run on `mixed` / legacy layouts without total lockout, ensure `nn-upgrade` (Flow A) cleanly migrates `specs/templates/`, and delete dead `models/` fallbacks.
4. **Unified Entry Routing & Lifecycle:** Establish `nn` as the sole canonical front controller, eliminate `nn-start`, update workspace `AGENTS.md` scaffolding in `bootstrap.js` to auto-invoke `nn`, and align living specs.

## 2. Errata in Archived Changes (Audit Trail)

The following claims and task tick marks in `openspec/changes/archive/2026-10-01-*` were found to be inaccurate upon static verification at HEAD `fc925f8a`:
- **Archived `nn-domain-state-probe/tasks.md` Task 1.1:** Marked ticked `[x]` (asserting watch digest test coverage), but no watch digest code or test assertion existed in `domain-probe.js` or `domain-probe.test.js`.
- **Archived `nn-domain-state-probe/tasks.md` Task 2.2:** Marked ticked `[x]` for a "gate-bypass check", which existed only as advisory prose without deterministic validation.
- **Archived Latency Claim:** Claimed `<200ms / <100ms with zero network blocking`, whereas `preflight-check.js` invoked uncapped serial `fetchWithTimeout` network calls at session startup.
- **Archived `pending_count` Semantics:** Claimed to count "unnormalized sources", but actually counted all files in `sources/import/` regardless of normalization status.

## 3. Scope of Work

### A. Contract Drift & Tool Naming
- Correct `validate.ts:842-843` runtime hint from non-existent `check_workspace` to canonical tools (`check_domain` / `hydrate_blueprint`) and update `freshness-warning.test.ts`.
- Fix inverted procedure filename patterns (`*_procedures_V_x-y-z_NN.md` -> `<name>_V_<semver>_procedures_NN.md`) in `nn-trannsform/SKILL.md` and `docs/innfo/template-package-spec.md`.
- Replace obsolete `validate_model` calls in `_samples_nn/procedures/*.md` with `validate_knowledge`.
- Clean up dead smoke tests (`innfo-mcp/tests/smoke-test.mjs`) and obsolete trivial-session discard text in `nn-trannsform` README and TESTING guides.
- Expand `scripts/skill-mcp-contract.test.mjs` to scan `skills/`, `_samples_nn/`, and runtime sources, verifying all MCP tools against `server.ts` while exempting historical `_V_` specs and OpenSpec backlogs.

### B. Layout & Gate Resilience
- Update `server.ts:80-93` so `check_domain` and read-only diagnostic tools can execute on `mixed` / legacy domains rather than returning a fatal error.
- Update `migrate-domain.js` (Flow A) to migrate `specs/templates/` to `specs/bluepriNNts/` and ensure clean post-migration status.
- Remove unannotated `models/` fallback reads in runtime scripts (`domain-probe.js`, etc.).

### C. Domain State Probe (P1–P5)
- **P1:** Fix `domain-probe.js` warning parsing to consume `runCheck`'s actual `results.items` and `results.summary` instead of non-existent `p.diagnostics`.
- **P2:** Calculate `pending_count` as raw files in `sources/import/` lacking a matching normalized sha256 in `sources/nn/`.
- **P3:** Provide fast, deterministic startup by executing preflight with `--offline` or bounded latency budget for the initial interactive probe.
- **P4:** Make `domain-probe.js` invocable across arbitrary workspace locations.
- **P5:** Remove bare `models/` read tolerances in `domain-probe.js`.

### D. Front Controller, Routing & Governance
- Remove `nn-start` and standardize on `nn` (`skills/nn/SKILL.md`) as the single front controller.
- Update `bootstrap.js` `generateAgentsMd` to output mandatory `## Session Start: Load nn (MANDATORY)` instructions.
- Ensure preflight exit code 1 (warnings) renders an actionable, non-blocking banner and continues directly to the Job Loop Menu (`[s][m][r][p]`).
- Update living specs (`router-governance`, `canonical-vocabulary`) via delta specs.

## 4. Success Criteria

- [ ] `skill-mcp-contract.test.mjs` passes with wide root scanning and zero retired MCP tool names in active surfaces.
- [ ] `domain-probe.js` correctly returns warnings from `preflight-check.js` (P1 resolved).
- [ ] `domain-probe.js` reports `pending_count = 0` when all imported files are normalized (P2 resolved).
- [ ] `domain-probe.js` executes deterministically and fast without network hangs (P3 resolved).
- [ ] `check_domain` returns diagnostics on `mixed` domains without hard rejection.
- [ ] `nn-upgrade` migrates `specs/templates/` to `specs/bluepriNNts/`.
- [ ] Bootstrapped workspaces scaffold `AGENTS.md` targeting `nn`.
- [ ] Living specs reflect canonical vocabulary (`bluepriNNt` as L2, `app`/`template` as deprecated aliases) and `nn` front controller.
