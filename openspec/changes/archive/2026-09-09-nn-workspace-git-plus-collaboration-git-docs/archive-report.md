# Archive Report: nn-workspace-git plus collaboration-git docs

**Change**: `2026-09-09-nn-workspace-git-plus-collaboration-git-docs`
**Archived**: 2026-09-12
**Mode**: openspec (repo-local)
**Status**: `success` — PASS WITH WARNINGS (non-critical)
**Baseline at archive**: `dev` @ `4bc2b62` (feature commit `bbdddf5` already in history)

## Archive Classification

Standard archive. `sdd-verify` returned **PASS WITH WARNINGS** with **no
CRITICAL** issues. All 3 delta specs verified compliant
(workspace-git-collaboration: 6 requirements / 8 scenarios;
documentation-template: 3 scenarios; monorepo-release-manifest:
deferred-expected registration). No native status reported `blockedReasons`.
No merge, tag, pin, manifest regeneration, branch operation, or user-facing
behavior change was performed by this phase.

## Task Completion Gate

✅ Passed. `tasks.md` shows **13/13** implementation checkboxes checked across
Phases 1–4, with **no unchecked implementation tasks**. Completion is backed
by inline RED/GREEN evidence in `tasks.md`, the persisted fixture suite
`actioNN/skills/nn-workspace-git/test/skill-contract.test.js` (all sections
pass), and re-run evidence in `verify-report.md`. `apply-progress.md` is
present (retro-persisted 2026-09-12). No stale-checkbox reconciliation was
needed or performed.

## Verification Verdict

`sdd-verify` → **PASS WITH WARNINGS**

- Completeness: all 13 tasks complete; apply-progress present; persisted test
  suite passing.
- Spec compliance matrix: 15/15 scenarios compliant.
- Design coherence: coherent; all 7 design decisions followed (standalone
  skill, explicit-only gate, double confirmation, private default +
  `.gitignore`, branch-per-change PR gates, two-layer map, offline backup,
  Guides Page `order:: 50`).
- Boundaries: `nn-innfo` untouched (empty diff); manifest registration
  deferred to `chore(release)` per amended spec.

### Warnings (recorded, non-blocking)

- **W1 — Foreign sibling WIP in shared tree.** 1 non-passing test
  (`shipped-template-versions.test.ts`) + Manifest Parity exit 1 for untracked
  `repository`/`video-generator` template dirs — provably not this change.
- **W2 — `scripts/backup-workspace.js` does not exist.** Primary backup path
  reference is dangling; functional `xcopy` fallback documented in the skill.
- **W3 — Review workload budget exceeded.** Commit `bbdddf5` = 775 changed
  lines (> 400); acknowledged under cached `single-pr-default` strategy.

### Suggestions (carried in verify-report, not blocking)

- **S1** — Extend the fixture suite as the skill contract evolves.
- **S2** — Land the manifest skill entry in the `chore(release)` commit with
  `check-parity` regen.

## Spec Sync

| Domain | Action | Details |
|--------|--------|---------|
| `workspace-git-collaboration` | Already synced (verified) | The delta spec is a full spec for the domain (no ADDED/MODIFIED sections). Main spec `openspec/specs/workspace-git-collaboration/spec.md` exists and matches the delta verbatim (6 requirements, 8 scenarios). |
| `documentation-template` | Already synced (verified) | Delta `## ADDED Requirements` (1 requirement: Collaboration Git Guide Page, 3 scenarios) was appended to the main spec as section `## 4. Collaboration Git Guide Page`. All pre-existing sections (1–3) preserved. |
| `monorepo-release-manifest` | Already synced (verified) | Delta `## ADDED Requirements` (1 requirement: Workspace Git Skill Registration, 2 scenarios) was appended to the main spec. The main spec carries the enriched release-time wording (registration FORBIDDEN in the feature change, precedent `73cbc64`). All pre-existing requirements preserved. |

The spec merge was performed during apply (commit `bbdddf5`, which included
all three `openspec/specs/*` updates) and verified at archive time:
`git diff HEAD -- openspec/specs/` is empty, confirming the source of truth
already reflects all delta requirements. No further merge was required and no
destructive merge occurred.

## Source of Truth Updated

Already current (no archive-time edits needed):

- `openspec/specs/workspace-git-collaboration/spec.md` — 6 requirements
  (Explicit Invocation Gate; Private Repository Default with Opinionated
  Ignore Rules; Branch-per-Change with Gated Review; Two-Layer Version Map;
  Timestamped Offline Backup; iNNfo Boundary)
- `openspec/specs/documentation-template/spec.md` — sections 1–4, including
  the new `Collaboration Git Guide Page` requirement
- `openspec/specs/monorepo-release-manifest/spec.md` — includes the new
  `Workspace Git Skill Registration` requirement

## Archived Contents

- `proposal.md` ✅
- `specs/workspace-git-collaboration/spec.md` ✅ (delta, preserved as evidence)
- `specs/documentation-template/spec.md` ✅ (delta, preserved as evidence)
- `specs/monorepo-release-manifest/spec.md` ✅ (delta, preserved as evidence)
- `design.md` ✅
- `tasks.md` ✅ (13/13 `[x]`)
- `apply-progress.md` ✅
- `verify-report.md` ✅
- `archive-report.md` ✅ (this file)

## Boundaries Respected

- No foreign uncommitted edit was staged, reverted, or committed. No `git add .`
  / `git add -A` over foreign paths. Commit is scoped to the archive paths
  only: `openspec/changes/archive/2026-09-09-nn-workspace-git-plus-collaboration-git-docs/`
  and the removed `openspec/changes/2026-09-09-nn-workspace-git-plus-collaboration-git-docs/`.
- Foreign working-tree WIP untouched: `docs/index.html` (M),
  `docs/use-cases.html` / `docs/use-cases.md` (untracked),
  `openspec/changes/2026-09-12-vocabulary-simplification/` (untracked).
- No merge, tag, pin, or manifest regeneration performed.

## Risks / Notes

- **W1/W2 carried forward**: the foreign template WIP must land before the
  next full `npm test` / `verify.js` run passes end-to-end; the
  `backup-workspace.js` dangling reference remains for the skill owner to
  reconcile (xcopy fallback documented).
- **Manifest registration deferred**: the `nn-workspace-git` entry in
  `manifest/source.yaml` lands in the `chore(release)` commit with
  `check-parity` regen, per amended spec (precedent `73cbc64`).