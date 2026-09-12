# Archive Report: dev-skills concurrency + deploy hardening

**Change**: `2026-09-10-dev-skills-concurrency-deploy-hardening`
**Archived**: 2026-09-12
**Mode**: openspec (repo-local)
**Status**: `success` — PASS WITH WARNINGS (non-critical)
**Baseline at archive**: `dev` @ `47c5510` (`origin/main` @ `984eed0`)

## Archive Classification

Standard archive. `sdd-verify` returned **PASS WITH WARNINGS** with **no
CRITICAL** issues. All 6 delta requirements (8 scenarios) verified compliant
against the working tree via hunk-level static evidence plus green executable
gates (`check-integrity.js`, `verify.js`, `check-integrity.js --pre-push`).
No native status reported `blockedReasons`; dispatcher state: archive ready,
nextRecommended archive. No merge, tag, pin, manifest regeneration, branch
operation, or user-facing behavior change was performed by this phase.

## Task Completion Gate

✅ Passed. `tasks.md` shows **17/17** implementation checkboxes checked
(`[x]`) across Phases 1–6, with **no unchecked implementation tasks**. Task
6.3 ("request review; merge per the NEW merge-gate") is a documented
orchestrator-sanctioned deferral (orchestrator decision 2026-09-12) to the
maintainer batched release flow — the merge `dev → main` is a maintainer act
(`nn-dev-development` §4e) and will dogfood the new merge gate during that
flow. Completion is backed by inline per-task evidence in `tasks.md` and the
re-run evidence in `verify-report.md` (8/8 scenarios compliant, 663 tests
green, all gates EXIT=0).

**Reconciliation note (recorded per sdd-archive stale-checkbox policy)**:
the committed (HEAD) `tasks.md` predates apply and still shows unchecked
boxes; the authoritative checked state lives in the working-tree modification
carried by `sdd-apply`. The dispatcher explicitly asserted "every task
checkbox is complete" and `verify-report.md` proves completion, so the
archived `tasks.md` is archived **with** its apply-evidence modification
(17/17 `[x]`) to satisfy the audit-trail rule that archived tasks must not
show stale unchecked tasks. The implementation batch itself — the 3 modified
`SKILL.md` files (and `ci.yml`, already committed by sibling `b13a37f`) —
remains uncommitted in the working tree for the maintainer batched release
flow; this archive phase did not stage, revert, or commit those files.

## Verification Verdict

`sdd-verify` → **PASS WITH WARNINGS**

- Completeness: all 17 tasks complete (16 done + 6.3 sanctioned deferral);
  no apply-progress artifact exists for this change (tasks.md carries the
  inline apply evidence — recorded in verify-report Suggestion 2).
- Spec compliance matrix: 8/8 scenarios compliant (static evidence + green
  gates per design substitution; no executable units exist for prose).
- Design coherence: coherent; all 5 design decisions followed (promote
  existing checks, no new scripts; worktree isolation rejected; dev CI
  primary with rehearsal fallback; pre-existing red → exception with run id;
  §1f claim joins §3 re-check).
- Boundaries: only the 4 target files touched by the change (3 SKILL.md +
  `ci.yml`); MCP, templates, editor, and user-facing skills untouched.

### Warnings (recorded, non-blocking)

- **W1 — Transient foreign red mid-verification.** One `--pre-push` run
  (~12:33) failed Group 5 spec-urls on 39 forbidden residual
  `cogNNitive/iNNfo` references in `cogNNitive_nn/specs/*`; attributed to
  foreign sibling WIP (commit `bee73a6`), fixed by sibling commit `47c5510`
  minutes later; re-run at 12:36 passed (EXIT=0). Not introduced by this
  change; signals the exact failure family this change hardens.
- **W2 — No apply-progress artifact.** `tasks.md` is the only apply evidence.
  Not a defect: design.md declares TDD N/A for prose and substitutes the
  executable gates, all of which pass. Recorded for transparency.

### Suggestions (carried in verify-report, not blocking)

- **S1** — `ci.yml` `pull_request.branches` was also extended to
  `[main, dev]` in sibling `b13a37f`, a superset of the design text
  (which scoped the trigger change to `push.branches`). Harmless and
  consistent; noted for archive/design sync.
- **S2** — No apply-progress.md exists for this change; tasks.md is the only
  apply evidence.
- **S3** — The change's own diff (3 SKILL.md + `ci.yml`) must be committed
  by the maintainer in the batched release flow (task 6.3); nothing was
  staged, reverted, or committed during verification or archive.

## Spec Sync

| Domain | Action | Details |
|--------|--------|---------|
| `dev-skills` | Created | Main spec `openspec/specs/dev-skills/spec.md` did not exist. The delta spec IS a full spec for the domain (no MODIFIED/REMOVED/RENAMED sections): all 6 `## ADDED Requirements` were promoted verbatim to the main spec's `## Requirements` (6 requirements, 8 scenarios), with the delta wrapper replaced by the standard full-spec framing (title + Purpose). No pre-existing requirements to preserve; no destructive merge. |

## Source of Truth Updated

- `openspec/specs/dev-skills/spec.md` — NEW: 6 requirements
  (Session-attributed in-flight work; Dirty-tree age rule; Session claim on
  the shared tree; CI-verified batches before merge; Merge gate on target
  health; Complete definition of deployed), 8 scenarios.

## Archived Contents

- `proposal.md` ✅
- `exploration.md` ✅
- `specs/dev-skills/spec.md` ✅ (delta, preserved as evidence)
- `design.md` ✅
- `tasks.md` ✅ (17/17 `[x]`, incl. 6.3 sanctioned deferral note)
- `state.yaml` ✅
- `verify-report.md` ✅
- `archive-report.md` ✅ (this file)
- `apply-progress.md` ➖ not produced for this change (see W2 / S2)

## Boundaries Respected

- No foreign uncommitted edit was staged, reverted, or committed. No `git add .`
  / `git add -A` over foreign paths. Commit is scoped to the archive paths
  only: `openspec/changes/archive/2026-09-10-dev-skills-concurrency-deploy-hardening/`,
  the removed `openspec/changes/2026-09-10-dev-skills-concurrency-deploy-hardening/`,
  and the new main spec `openspec/specs/dev-skills/spec.md`.
- Implementation batch untouched and uncommitted (task 6.3 deferral):
  `.agents/skills/nn-dev-development/SKILL.md`,
  `.agents/skills/nn-dev-check-integrity/SKILL.md`,
  `.agents/skills/nn-dev-release/SKILL.md` (working-tree `M`).
- Foreign working-tree WIP untouched: `openspec/changes/2026-09-12-vocabulary-simplification/`
  and `openspec/specs/canonical-vocabulary/` (untracked).
- No merge, tag, pin, or manifest regeneration performed.

## Risks / Notes

- **W1/W2 carried forward**: the merged sibling work on `main` (5 commits
  during the verification window) must land before the next clean baseline
  comparison; the missing apply-progress artifact remains a process note.
- **Archived tasks.md carries its apply evidence** (see Task Completion Gate
  reconciliation note): the checked state is the authoritative artifact state
  and the archive audit trail must not show stale unchecked tasks. The 3
  SKILL.md modifications remain uncommitted for the maintainer batch.
- **Merge-gate dogfooding pending**: the new `dev → main` merge gate will be
  exercised for the first time when the maintainer runs the batched release
  flow (task 6.3 deferral).