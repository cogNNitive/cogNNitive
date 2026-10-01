# Tasks: Consolidated /nn Entry-Flow Follow-up & Defect Remediation

## 1. Domain State Probe Remediation (P1–P5)
- [x] 1.1 Fix preflight warning extraction in `skills/nn-preflight/scripts/domain-probe.js` by parsing `results.items` (P1).
- [x] 1.2 Implement sha256-based pending source calculation in `domain-probe.js` comparing `sources/import/` against `sources/nn/` (P2).
- [x] 1.3 Add bounded/offline execution for session startup in `domain-probe.js` (P3).
- [x] 1.4 Resolve portable path handling for `domain-probe.js` (P4).
- [x] 1.5 Remove bare `models/` fallback reads in `domain-probe.js` (P5).
- [x] 1.6 Add comprehensive integration tests in `skills/nn-preflight/scripts/domain-probe.test.js` covering P1–P5.

## 2. MCP Runtime Hints & Diagnostics
- [x] 2.1 Update `validate.ts:842-843` runtime hint from `check_workspace` to `check_domain` / `hydrate_blueprint`.
- [x] 2.2 Update `freshness-warning.test.ts` assertions to match the updated diagnostic text.

## 3. Layout Gate Interceptor & Migration
- [x] 3.1 Modify `checkDomainLegacy` in `iNNfo/packages/innfo-mcp/src/server.ts` to allow diagnostic tools (`check_domain`, `validate_knowledge_url`, `get_spec`, `list_blueprints`) on `mixed` / legacy layouts.
- [x] 3.2 Update `skills/nn-upgrade/scripts/migrate-domain.js` to migrate `specs/templates/` to `specs/bluepriNNts/`.
- [x] 3.3 Verify layout migration test suite in `skills/nn-upgrade/scripts/migrate-domain.test.js`.

## 4. Front Controller & Scaffolding
- [x] 4.1 Update `generateAgentsMd` in `skills/nn-trannsform/scripts/lib/bootstrap.js` to scaffold `## Session Start: Load nn (MANDATORY)`.
- [x] 4.2 Delete `skills/nn-start/` and remove references across skills.
- [x] 4.3 Update `.agents/skills/nn/SKILL.md` to point directly to `skills/nn/SKILL.md` instead of looping through `nn-start`.
- [x] 4.4 Align `manifest/source.yaml` to remove `nn-start` and ensure `nn` is properly registered.

## 5. Contract Drift Guard, Documentation & Living Specs
- [x] 5.1 Fix procedure filename patterns in `skills/nn-trannsform/SKILL.md` (docs/ changes deferred to avoid collision with sibling session).
- [x] 5.2 Replace retired MCP tool citations in `_samples_nn/procedures/*.md` (`validate_model` -> `validate_knowledge`).
- [x] 5.3 Remove obsolete trivial discard references in `skills/nn-trannsform/README.md` and `TESTING.md`.
- [x] 5.4 Remove dead smoke test `iNNfo/packages/innfo-mcp/tests/smoke-test.mjs`.
- [x] 5.5 Expand `scripts/skill-mcp-contract.test.mjs` to scan `skills/`, `_samples_nn/`, and runtime sources with full tool verification against `server.ts`.
- [x] 5.6 Update stale living specs (`openspec/specs/canonical-vocabulary/spec.md`, `openspec/specs/router-governance/spec.md`, etc.).
- [x] 5.7 Run targeted test suites and verify integrity gates.
