# Archive Report: Metrics Console Adoption

**Change**: `2026-09-12-metrics-console-adoption`
**Archived**: 2026-09-12
**Mode**: openspec (repo-local)
**Status**: `success` — PASS WITH WARNINGS (non-critical)
**Baseline at archive**: `dev` @ `ee37c35` (in sync with `origin/dev`; `origin/main` @ `ee37c35`)

## Archive Classification

Standard archive. `sdd-verify` returned **PASS WITH WARNINGS** with **no
CRITICAL** issues. All 8 requirements (14/14 scenarios) verified compliant with
runtime evidence (gate open, slots-only timeline console renders via `file://`
with zero pageerrors, 2 uPlot charts from pure-data series, no `eval` anywhere,
rename complete, Apply Feedback replaces archive, harness fail-fast naming
proven). No native status reported `blockedReasons`. No merge, tag, pin,
manifest regeneration, branch operation, or user-facing behavior change was
performed by this phase.

## Task Completion Gate

✅ Passed. `tasks.md` shows **27/27** implementation checkboxes checked (11
carried-over rows from the prior apply record + 16 amendment rows across Phases
0–3), with **no unchecked implementation tasks**. Completion is backed by
inline RED/GREEN evidence in `tasks.md` and re-run evidence in
`verify-report.md`. No stale-checkbox reconciliation was needed or performed.

## Verification Verdict

`sdd-verify` → **PASS WITH WARNINGS**

- Completeness: all 27 tasks complete.
- Spec compliance matrix: 14/14 scenarios compliant (13 with passing tests, 1
  via verified static evidence).
- Design coherence: coherent; all 7 design decisions followed (series-as-data,
  minimal needs[], shared renderer, artifact-only rename, activation gate,
  stable-name regen, bundle-vs-runtime reconciliation).
- Boundaries: no merge / tag / pin / manifest / user-facing change;
  `HEAD == ee37c35`.

### Warnings (recorded, non-blocking)

- **W1 — No formal TDD Cycle Evidence table.** `apply-progress.md` absent;
  tasks.md carries inline RED/GREEN evidence instead. Evidence substance
  verified against reality (all test files exist, all pass) — reporting-format
  gap, not a protocol failure.
- **W2 — FOREIGN BLOCKER (not this change).** `npm --prefix iNNfo run test`
  short-circuits at `packages/innfo-mcp` `src/server.spec.ts`:
  `ReferenceError: __INNFO_MCP_VERSION__ is not defined` (version define not
  wired into vitest config). Root cause: sibling agent's in-flight MCP
  migration staged in tree (`iNNfo/packages/innfo-mcp/` + `manifest/source.yaml`).
  **Not fixed, staged, reverted, or committed by this phase.** innfo-core +
  innfo-editor + all metrics-console suites pass.

### Documented Follow-ups (do NOT fix in this phase)

- **F1 — Stale doc path**: `docs/innfo/documentation/offline-consoles.md:104`
  still lists `metrics/assets/projections.html` (renamed → `assets/timeline.html`).
  Flagged for the docs owner to reconcile.
- **F2 — Stale live openspec reference**:
  `openspec/specs/innfo-console-runtime/spec.md:43` lists
  `metrics/assets/projections.html` among the three reference assets to thin.
  Out of this change's scope (proposal: no `openspec/specs/` changes) but now
  stale after the rename; reviewer/maintainer should reconcile.

### Suggestions (carried in verify-report, not blocking)

- **S1** — Add a doc-content assertion pinning the resolution-record wording
  (ADOPTED series-as-data / REJECTED executable-logic with reasons) in
  `create_timeline_NN.md`, following the existing gate/feedback doc-assertion
  test pattern.
- **S2** — Ghostbusters sample model does not carry `scenarioType` values
  (`historical`/`projection`); a sample exercising both values would harden the
  "model remains valid after the rename" scenario.

## Spec Sync

| Domain | Action | Details |
|--------|--------|---------|
| `metrics-console-adoption` | Created | `openspec/specs/metrics-console-adoption/spec.md` did not exist; the delta spec is a full spec for the domain. It was copied into the main-spec location, normalized to the repository's main-spec shape (`# metrics-console-adoption Specification` + `## Purpose` + `## Requirements`, with the eight requirement blocks preserved verbatim). No requirements were removed or modified. |

No other domains were touched. No existing main specs were modified, so no
destructive merge occurred.

## Source of Truth Updated

- `openspec/specs/metrics-console-adoption/spec.md` now contains the eight
  requirements:
  1. Activation Gate Before Thinning
  2. Thinned Console Artifact Shape
  3. Series-as-Data Slot Contract
  4. Shared Console Charts Capability
  5. Code-as-Slot Resolution Record
  6. Console Generation Procedure
  7. Timeline Rename (artifact only)
  8. Harness and Sample Verification

## Archived Contents

- `proposal.md` ✅
- `specs/metrics-console-adoption/spec.md` ✅ (delta, preserved as evidence)
- `design.md` ✅
- `tasks.md` ✅ (27/27 `[x]`)
- `verify-report.md` ✅
- `archive-report.md` ✅ (this file)

## Boundaries Respected

- No foreign uncommitted edit was staged, reverted, or committed. No `git add .`
  / `git add -A` over foreign paths. Commit (if created) is scoped to the
  archive paths only: `openspec/changes/archive/2026-09-12-metrics-console-adoption/`
  and `openspec/specs/metrics-console-adoption/spec.md`.
- Foreign staged WIP in `iNNfo/packages/innfo-mcp/` + `manifest/source.yaml`
  untouched.
- Sibling in-flight archive of
  `openspec/changes/2026-09-11-conversation-author-attribution/` (worktree
  deletions + untracked archive folder) untouched.
- No merge, tag, pin, or manifest regeneration performed.

## Risks / Notes

- **F1/F2 carried forward**: the two stale `projections.html` references remain
  until the docs owner / maintainer reconciles them; neither blocks this
  change's archive readiness.
- **W2 carried forward**: the foreign innfo-mcp vitest define gap must be fixed
  by the sibling agent owning that migration before the next full `npm test`
  run can pass end-to-end.
- One intentional archive-time normalization: the new main spec uses
  `## Requirements` instead of the delta's `## ADDED Requirements`. Requirement
  text is unchanged.