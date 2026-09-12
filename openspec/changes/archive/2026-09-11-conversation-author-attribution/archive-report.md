# SDD Archive Report — 2026-09-11-conversation-author-attribution

**Change**: conversation-author-attribution
**Archiver**: sdd-archive executor (deepseek-v4-flash)
**Date**: 2026-09-12
**Mode**: openspec
**Baseline**: implementation committed at 57c39aa (ancestor of HEAD, present on dev and main)

## Status

**success — intentional-with-warnings**

The change is archived with two documented, non-blocking environmental warnings (both carried over from the verify phase, none attributable to this change):

1. **innfo-mcp `src/server.spec.ts` environmental failure** — the shared working tree carries uncommitted files from concurrent agent `metrics-console-adoption` (including `iNNfo/packages/innfo-mcp/src/server.ts` + `tsup.config.ts`), whose rewrite relies on `__INNFO_MCP_VERSION__` defined only via tsup `define:`; vitest does not provide it → `ReferenceError`, 34 tests fail to load (229 others pass). Proven non-regressive: this change's 9 files are all committed and `git diff HEAD`-clean; the standalone innfo-mcp suite passed **263/263 at clean HEAD** before the concurrent edits landed. Per guardrails, the concurrent agent's files were NOT touched, staged, reverted, or committed.
2. **nn-trannsform PowerShell suites** (`test:promotion`, `test:integration`) not verifiable in this environment (no pwsh) — marked not-verified per the 2026-09-07 precedent; non-blocking.

No CRITICAL issues in verify-report; task gate fully passed (12/12 tasks checked in `tasks.md`, no stale unchecked rows).

## Change Summary

Resolved the N:M agent-vs-user author distinction explicitly deferred in `2026-09-07-agent-modifications-source-provenance`. Promoted transcripts and pasted Agent Modification blocks now say WHO PRODUCED a turn or mutation, not only WHO AUTHORIZED it:

- **`author::` key** in the canonical Agent Modification block — caller-supplied via `AgentModificationContext.author?`, emitted between `approved_by::` and `model::`, `author:: _` marker when absent (mirror of `rationale:: _`). `approved_by::` = WHO AUTHORIZED; `author::` = WHO PRODUCED — distinct, coexisting semantics.
- **`## NN Turn NN: <author-id>` headings** for human/agent turns in promoted `_source.md` transcripts — 1-based, zero-padded, unique per turn, `@`-citeable; `author::` NOT duplicated on turn headings.
- **Author-naming step** in the nn-trannsform interactive promotion prompt on the `[full]` path — suggests human name (git config user.name AND OS user, manual entry, skip → `unnamed`) and agent tool id; user confirms/edits.
- **nn-innfo verbatim-paste mandate** extended: agent MUST replace `author:: _` with its own tool id at paste time.
- **Citation reconciliation**: `## NN …: …` headings use the `@` pointer grammar (`sources:: [conversations/<session-slug>_source.md@## NN Turn NN: <author-id>]`, `…@## NN Agent Modification: <scope>]); the `#<slug>` fragment form MUST NOT be used (the `--` Concept/Element boundary in the slug is rejected by `parseSourceRef` → `KU_MALFORMED` — re-verified at runtime in the verify phase).

Convention prose: agent ids = tool names (OpenCode/Antigravity/ClaudeCode), human ids = participant names; no structured envelope, no participants registry (YAGNI).

## Spec Deltas Merged

| Domain | Action | Details |
|--------|--------|---------|
| agent-modification-provenance | Updated (2 requirements modified) | `Canonical Block Field Contract`: added `author::` key (between `approved_by::` and `model::`), `_` marker fallback, convention prose, 3 new scenarios. `nn-innfo Mandates Verbatim Block Paste`: added author-marker fill mandate + `@` pointer grammar with `KU_MALFORMED` reasoning, 1 new scenario, 1 scenario rewritten to `@` form. Requirements 1 and 3 preserved unchanged. |
| conversations-lifecycle | Updated (1 requirement modified) | `Interactive Transcript Promotion Prompt`: added author-naming step, `## NN Turn NN: <author-id>` heading contract (`@`-citeable, no `author::` key, `unnamed` fallback), 3 new scenarios. Requirements 1-3 preserved unchanged. |

Merged into `openspec/specs/agent-modification-provenance/spec.md` and `openspec/specs/conversations-lifecycle/spec.md` (delta wrapper removed; canonical `### Requirement:` / `#### Scenario:` structure retained; non-delta requirements preserved verbatim).

**Purpose sections updated** (coherence, within the merged specs):
- `agent-modification-provenance`: filled the `TBD — created by archiving change 2026-09-07…` placeholder (left by the prior archive) with an accurate capability description.
- `conversations-lifecycle`: removed the stale "executive summary / both" phrasing that contradicted the (already merged, and re-affirmed by this delta) two-option promotion contract.

## Task Completion Gate

- Tasks total: 12 — complete: 12 — incomplete: 0 (all `[x]`, verified in `tasks.md`; no unchecked rows at archive time).
- No archive-time stale-checkbox reconciliation needed.

## Verification Evidence (from verify-report.md, 2026-09-12)

| Suite | Result |
|-------|--------|
| innfo-core | ✅ 57 files / **707 passed / 1 skipped** |
| innfo-mcp mutate.spec.ts (change scope) | ✅ **45/45 passed** (incl. 4 author cases + marker fallback) |
| innfo-mcp standalone (clean HEAD baseline) | ✅ **263/263 passed** |
| nn-trannsform | ✅ **374 passed / 0 failed** (conversation lifecycle 65/65) |
| Lint | ✅ 0 errors (501 pre-existing warnings, none in changed files) |
| Typecheck | ✅ clean (innfo-core tsc + innfo-editor vue-tsc) |
| Spec compliance | ✅ 15/15 scenarios compliant (11 test-covered + 4 prose-only audits) |
| `@`-pointer runtime re-verification | ✅ 4/4 transient spec cases: `#<slug>` forms → null (`KU_MALFORMED`); `@## NN …: …` forms resolve |

## Not Verified / Environmental

- **nn-trannsform PowerShell suites** (`test:promotion`, `test:integration`): not runnable in this environment (no pwsh); marked not-verified per 2026-09-07 precedent.
- **Workspace gate** `npm --prefix iNNfo run test`: aborts at the innfo-mcp segment (environmental `server.spec.ts` failure from concurrent `metrics-console-adoption` uncommitted rewrite); innfo-editor suite never ran (`&&` chain) — editor untouched by this change and not dirty; no regression signal.
- **Coverage**: not run — informational gate per config; not part of task 12 gate criteria.

## Guardrail Compliance

Concurrent-agent (`metrics-console-adoption`) files left untouched — NOT staged, reverted, or committed: `iNNfo/packages/innfo-mcp/src/server.ts`, `tsup.config.ts`, `bin/innfo-mcp.bundle.js`, `iNNfo/package.json`, `innfo-core/package.json`, `innfo-editor/package.json`, `innfo-mcp/package.json`, `specs/templates/metrics/assets/MODEL_DATA.template.json`, `manifest/source.yaml`, `openspec/changes/metrics-console-adoption/tasks.md`. No `git add` / commit performed.

## Archive Contents

`openspec/changes/archive/2026-09-11-conversation-author-attribution/`

- proposal.md ✅
- design.md ✅
- specs/agent-modification-provenance/spec.md ✅ (delta)
- specs/conversations-lifecycle/spec.md ✅ (delta)
- tasks.md ✅ (12/12 complete)
- verify-report.md ✅ (PASS WITH WARNINGS)
- archive-report.md ✅ (this file)

Active `openspec/changes/` no longer contains this change.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.