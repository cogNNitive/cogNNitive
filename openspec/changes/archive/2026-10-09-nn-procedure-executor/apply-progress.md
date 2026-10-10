# Apply Progress: nn-procedure-executor

Mode: openspec. Strict TDD active. Base for Phase 2: `5cd5086a`.

## Phase 1 (protocol consolidation) — done, landed to dev @ ded06511

- Added `## 16-bis Procedure Execution Protocol` to `skills/nn-innfo/SKILL.md`
  (Trigger, Discovery, Step-order FSM, Output routing, Delegation, Adaptation).
- `skills/nn/SKILL.md` §3 reduced to an "Execution Owner" pointer (catalog +
  precedence kept).
- `node scripts/verify.js` 144/144; lint/typecheck/prettier green.

## Phase 2 (rename + shrink) — done

`skills/nn-trannsform/` → `skills/nn-sources/`; dropped the "[a] iNNfo V_0-1-0
template" option, the `[b]` Markdown menu, and the `--apply`/`transformer.js`
path; docs regenerated; host installs renamed.

## TDD cycle evidence (Phase 2)

| Task | Test | RED | GREEN |
|------|------|-----|-------|
| 2.1–2.3 name assertions | `skills/nn-sources/test/test.ps1` | 30 pass / 1 fail (`SKILL.md name matches directory`) | 29/0 |
| 2.1–2.4 shared-rules map | `scripts/build-skill-shared-rules.test.mjs` | exit 1 (undefined map key) | passes (3 rule-ids) |
| 2.1/2.7 docs page-set | `scripts/generate-docs-facts.mjs --check` | exit 2 (page-set mismatch) | exit 0 |
| 2.8 shrink | `npm --prefix skills/nn-sources test` | transformer path removed | 621/0 |

## Gates

- `node scripts/verify.js` → 144/144, exit 0
- `node scripts/check-integrity.js` → ALL GATES PASSED, exit 0
- `node scripts/build-skill-shared-rules.mjs --check` → exit 0
- `node scripts/generate-docs-facts.mjs --check` → exit 0
- `node scripts/sync-versions.mjs --check` → exit 0

## Post-verify correction (2026-10-09)

- Removed the `template-procedures-manifest-and-discovery` delta (R-TPD-02):
  it demanded MCP discovery code that the agent-side protocol decision (Q1)
  does not need; the discovery requirement lives in `procedure-execution`.
- Fixed stale `nn-trannsform` references in `openspec/config.yaml` → `nn-sources`.
