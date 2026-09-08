# Archive Report: Canonical Template Package Distribution (2026-09-08)

**Archived**: 2026-09-08
**Mode**: openspec
**Status**: `success` — **intentional-with-warnings** (stale-checkbox reconciliation, orchestrator-approved)

## Archive Classification

This change is archived as **intentional-with-warnings** solely due to stale
unchecked checkboxes in `tasks.md`. The work itself is fully implemented,
verified, and merged to `main`. No CRITICAL verification issues were ever
reported for this change.

## Change Summary

Established canonical, unversioned template distribution for the iNNfo
template ecosystem:

- **Canonical filenames**: Root workspace template renamed to unversioned
  `workspace_spec_NN.md`; subdirectory templates normalized to canonical
  `spec_NN.md`; orphaned historical versioned templates removed; SOP
  procedures (`procedures/`), samples (`samples/`), and static assets
  (`assets/`) normalized to unversioned canonical names.
- **Frontmatter `template_version`**: Declared authoritatively as the
  evolving source of truth; the immutability guard derives semver from it
  (`normalizeVersion` maps `V_0-2-0` → `0.2.0`).
- **Immutable git release tags**: `templates-v<version>` (stable template
  refs) and `v<version>` (developer release), enabling tag-pinned remote
  template hydration and end-to-end upstream traceability (L3 → L2 → L1 → L0).
- **Full-package hydration**: `hydrateTemplatePackageAtomically` accepts a
  full package payload (canonical spec + backward-compatible alias +
  `procedures/` + `samples/` + `assets/`) staged and renamed atomically into
  versioned workspace cache `specs/templates/<name>/<version>/`, with
  write-once immutability.
- **5-tier resolution precedence**: workspace package directory → workspace
  flat fallback → global cache → installed skills → tag-pinned remote
  hydration.
- **Retirement**: `template-version-pruning` spec marked RETIRED (replaced by
  isolated versioned workspace caching); legacy `template-immutability-guard`
  requirements marked RETIRED (superseded by frontmatter `template_version`
  bump CI validation).

## Implementation Status

| Phase | Status | Evidence |
| :--- | :--- | :--- |
| Phase 1 — Canonical filenames & frontmatter | ✅ Complete | commit `8fe698c` |
| Phase 2 — Resolver & full-package hydration + retire `prune_orphaned_specs` | ✅ Complete | commit `27997f6` |
| Phase 3 — Modernize CI immutability guard | ✅ Complete | commit `d47f7bf` |
| Phase 4 — Manifest paths | ✅ Complete | paths landed in Phase 1 commit; stable refs reconciled to `templates-v0.3.1` via PR #76 (commit `6db5303`) |
| Phase 5 — OpenSpec specification updates | ✅ Complete | commit `37d6764` |
| Phase 6 — Integration verification | ✅ GREEN | `node scripts/verify.js` on 2026-09-08 (all gates pass, stable manifest validated) |

Additional commit: `baf0bbc` (tests). Merged to `main` via PR #74
(merge commit `2295fbb`).

## Task Completion Gate (exceptional stale-checkbox reconciliation)

The persisted `tasks.md` contains **many unchecked `- [ ]` boxes** across all
phases. This is **exceptional STALE-CHECKBOX RECONCILIATION, explicitly
approved by the orchestrator**. The checkboxes were never ticked during
apply, but completion is independently proven:

- `apply-progress.md` documents Phases 1–6 complete (with Phase 4 paths and
  Phase 6 verification detailed).
- `node scripts/verify.js` runs **ALL GREEN** on the current tree
  (executed 2026-09-08; all 10 deterministic gates pass, stable manifest
  validated).
- The work was merged to `main` via PR #74 (merge commit `2295fbb`, branch
  commits `8fe698c` P1, `d47f7bf` P3, `37d6764` P5, `27997f6` P2, `baf0bbc`
  tests), plus the stable-refs reconciliation PR #76
  (`templates-v0.3.1`, commit `6db5303`).

Per the SDD archive skill, the archive gate allows proceeding only when the
orchestrator explicitly instructs stale-checkbox reconciliation backed by
`apply-progress`/`verify-report` proof. That approval was granted for this
change, so archiving proceeds. The exact reconciliation reason is recorded
here and in this report.

## Specs Sync Status

The delta specs were already reflected into the living specs during Phase 5.
All four target living specs were verified present and synced (no re-sync
needed):

| Domain (living spec) | Status | Action |
| :--- | :--- | :--- |
| `openspec/specs/template-release-tagging/spec.md` | ✅ exists | Created (new living spec) |
| `openspec/specs/template-package-structure/spec.md` | ✅ exists | Updated |
| `openspec/specs/template-version-pruning/spec.md` | ✅ exists | RETIRED banner |
| `openspec/specs/template-immutability-guard/spec.md` | ✅ exists | RETIRED banner |

No living spec was modified during archive beyond confirming its presence.

## Archived Contents

- `archive-report.md` (this file)
- `proposal.md`
- `design.md`
- `tasks.md` (stale checkboxes reconciled at archive time — see above)
- `apply-progress.md`
- `specs/` (4 delta specs: `template-release-tagging`, `template-package-structure`, `template-version-pruning`, `template-immutability-guard`)

## Risks / Notes

- No formal `verify-report.md` exists; verification evidence is
  `apply-progress.md` + the green `node scripts/verify.js` run + merge
  commits. No CRITICAL verification issues were reported.
- The archived `tasks.md` retains unchecked boxes as an intentional
  audit-trail record; completion is proven by the reconciliation evidence
  above.
