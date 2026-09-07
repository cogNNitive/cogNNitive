# Tasks: Agent Modifications Source Provenance

## Review Workload Forecast

~550–650 changed lines · risk Medium (repo cap 800 — single PR) · Delivery single-pr.

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

Single PR; work units: 1 = core builder + mcp wiring; 2 = nn-innfo + nn-trannsform.

## Phase 1 — innfo-core block builder (TDD)

- [ ] 1.1 RED — Create `iNNfo/packages/innfo-core/src/agentModification.spec.ts`: determinism (same op/args/ctx + fixed timestamp → identical block; no fs/mutation); fixed key order `scope,change,rationale,approved_by,model,[version_transition],model_version,timestamp`; `rationale:: _` fallback; approved_by default `agent` / override `user`; per-op `scope::` = design table (all 10 ops; `set_marker "<markerName>"`; `bump_version "<prev>" → "<result>"`); `add_marker` → no block; slug parity `slugifyHeading(scope)` = extractHeadings slug of pasted heading. → RED.
- [ ] 1.2 GREEN — Implement `src/agentModification.ts`: pure `buildAgentModificationBlock(op,args,ctx)` + `AgentModificationContext{model,modelVersion,timestamp?,rationale?,approvedBy?,versionTransition?}`; block opens `## NN Agent Modification: <slugifyHeading(scope)>`; `version_transition::` only for bump_version; no block for unknown ops. → GREEN.
- [ ] 1.3 Re-export builder + type from `src/index.ts`, `src/browser.ts`.
- [ ] 1.4 Verify: `npm --prefix iNNfo/packages/innfo-core test`; lint, typecheck; format zero new drift.

## Phase 2 — innfo-mcp `modification` field (TDD)

- [ ] 2.1 RED — Extend `applyChange` in `iNNfo/packages/innfo-mcp/src/tools/mutate.spec.ts`: `modification` present on general AND bump_version success (scope states bump, prev+result); absent on failure (duplicate element / invalid op / invalid version); `args.rationale`/`args.approved_by` flow through. → RED.
- [ ] 2.2 GREEN — `apply-change.ts`: add `modification?: string` to `ApplyChangeResult`; populate at general success (~L400: model id, resulting `model_version`, rationale/approvedBy from args) and `bumpVersion` success (~L268: + `versionTransition:{from,to}`); absent on all failures. → GREEN.
- [ ] 2.3 Verify: `npm --prefix iNNfo run test` (core+mcp+editor); lint, typecheck; format zero new drift.

## Phase 3 — nn-innfo SKILL.md

- [ ] 3.1 §0 conversation-lifecycle prompt (L33): options → `[full]`, `[none]` only.
- [ ] 3.2 §5/§8: mandate verbatim paste of returned `modification` under `## NN Agent Modification: <scopeSlug>`; replace `rationale:: _` marker; never fabricate when absent.
- [ ] 3.3 §4: `models/<path>.md#<slug>` first-class citation target; cross-reference heading-level convention (H1/H2/H3).
- [ ] 3.4 Frontmatter: `version: "V_0-3-0"`, `last_updated: 2026-09-07`.

## Phase 4 — nn-trannsform promotion flow + citations (TDD)

- [ ] 4.1 RED — Update `test/unit/test-conversations-lifecycle.js`: `PROMOTION_OPTIONS` length 2, values `[full, none]`; `summary`/`both` → no `_summary.md`, empty `promotedFiles`; `full` → only `_source.md`; CLI uses `--format full`. → RED.
- [ ] 4.2 GREEN — `scripts/lib/conversations.js`: options `[full] (Recommended)`, `[none]`; drop summary/both branches in `promoteConversation`; keep `none` early-return + `scanAndProcess`. → GREEN.
- [ ] 4.3 SKILL.md §2f: menu `[full]`/`[none]`; raw transcript always registered, `_source.md` optional; CLI example `--format full`; Agent Modification provenance note (`## NN Agent Modification` headings citeable via `conversations/<slug>_source.md#<slug>`).
- [ ] 4.4 `citations.md`: Models first-class (`models/<path>.md#<slug>`); artifact→model→source chain; reword canonical resolution (`sources/nn/` for Sources, `models/` for Models; unqualified under `sources/nn/`); heading-level convention as authoring rule.
- [ ] 4.5 Frontmatter: `version: "V_3-1-0"`, add `last_updated: 2026-09-07`.
- [ ] 4.6 E2E — Create `test/test-promotion-e2e.ps1` (harness per `test.ps1`): promote full → `_source.md` exists, no `_summary.md`; menu `[full]`/`[none]` only; add `test:promotion` npm script; pwsh → pass.
- [ ] 4.7 Verify: nn-trannsform test + test:integration + test:promotion; full iNNfo suite; lint, typecheck; format zero new drift.
