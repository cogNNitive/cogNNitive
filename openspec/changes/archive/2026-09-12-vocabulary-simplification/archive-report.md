# Archive Report: Vocabulary Simplification

**Change**: `2026-09-12-vocabulary-simplification`
**Archived**: 2026-09-12
**Mode**: openspec (repo-local)
**Status**: `success` — PASS

## Archive Classification

Standard archive. `sdd-verify` returned **PASS** with **no CRITICAL, WARNING, or
blocking** issues — only SUGGESTION-level prose residuals (S-1, S-2) and a
strict-TDD process artifact gap (S-3). All 23/23 tasks complete. No native
status reported `blockedReasons`; dispatcher state: archive ready,
nextRecommended archive. This archive phase performed only spec sync + folder
move; no source file, identifier, or behavior change was made.

## Task Completion Gate

✅ Passed. `tasks.md` shows **23/23** implementation checkboxes checked (`[x]`)
across Phases 1–5, with **no unchecked implementation tasks**. Completion is
backed by inline per-task evidence in `tasks.md` and the re-run evidence in
`verify-report.md` (1104 tests passed, 0 failed; lint/typecheck clean;
template-catalog `--check` green; no identifier migration).

## Verification Verdict

`sdd-verify` → **PASS**

- Completeness: all 23 tasks complete; no `apply-progress.md` artifact exists
  for this change (the RED→GREEN guard test pattern is encoded in tasks 1.4/4.1
  and `iNNfo/specs/scripts/test-vocabulary.js` passes 20/20 — recorded in
  verify-report W-1/S-3).
- Spec compliance matrix: 4/4 scenarios compliant (vocabulary contract,
  tool-name stability, nn-trannsform exclusion, manifest parity).
- Design coherence: coherent; all 5 design decisions followed (user-facing
  only, both dictionary forms, sense-scoped manual pass, catalog regen, apply
  sequenced after sibling archive).
- Boundaries: implementation touches `iNNfo/specs/vocabulary.json`,
  `docs/innfo/documentation/vocabulary.md`, `iNNfo/AGENTS.md`,
  `iNNfo/specs/templates/*/spec_NN.md` titles, `catalog.json`, editor `.vue`
  labels, skills (`nn-innfo`, `nn-trannsform`, `nn-template-audit`), docs prose,
  and the backlog work item — **NOT touched by this archive phase**.

### Suggestions (carried in verify-report, not blocking)

- **S1** — `docs/use/manifest.md` conceptual prose still uses "template" in a
  few description strings; reads as references to the technical `templates:`
  mechanism, so no requirement is violated.
- **S2** — `SetupWizard.vue` L235 user-facing error string still reads
  `Template "${templateChoice.value}" not found.` (error path only; file not in
  task scope).
- **S3** — Strict-TDD `apply-progress.md` artifact not produced; guard test
  exists and passes, so the RED→GREEN pattern is satisfied in substance.

## Spec Sync

| Domain | Action | Details |
|--------|--------|---------|
| `template-ecosystem-documentation` | Updated | Main spec `openspec/specs/template-ecosystem-documentation/spec.md` existed. Merged the delta: 1 ADDED requirement (User-facing documentation uses `app` for the Level-2 schema sense, 3 scenarios) appended; 1 MODIFIED requirement (eNNvironment Manifest Specification Parity) replaced with the updated text (+2 `AND` scenario steps). All non-delta requirements preserved. |
| `canonical-vocabulary` | No change | Main spec `openspec/specs/canonical-vocabulary/spec.md` **already exists** (created during apply by sibling commits `4814609`/`f9c9b11` as the full canonical-vocabulary spec — 5 requirements, 8 scenarios). The change's delta folder contains NO `canonical-vocabulary` delta spec, so no destructive re-merge was performed. Verdict: skip; the existing main spec already reflects the change's intent. |

## Source of Truth Updated

- `openspec/specs/template-ecosystem-documentation/spec.md` — ADDED 1
  requirement (User-facing documentation uses `app` for the Level-2 schema
  sense, 3 scenarios); MODIFIED 1 requirement (eNNvironment Manifest
  Specification Parity). Non-delta requirements preserved.
- `openspec/specs/canonical-vocabulary/spec.md` — unchanged (already reflects
  this change from the apply phase; no delta to merge).

## Archived Contents

- `proposal.md` ✅
- `specs/template-ecosystem-documentation/spec.md` ✅ (delta, preserved as evidence)
- `design.md` ✅
- `tasks.md` ✅ (23/23 `[x]`)
- `verify-report.md` ✅ (PASS, authoritative working-tree version)
- `element-audit.md` ✅ (task 3.1 audit report, F1–F4 + proposed surface)
- `exploration.md` ✅
- `archive-report.md` ✅ (this file)
- `state.yaml` ➖ not produced for this change

## Boundaries Respected

- No foreign uncommitted edit was staged, reverted, or committed. No `git add .`
  / `git add -A` over foreign paths. Commit is scoped to the archive paths
  only: the new
  `openspec/changes/archive/2026-09-12-vocabulary-simplification/`, the removed
  `openspec/changes/2026-09-12-vocabulary-simplification/`, and the updated
  main spec `openspec/specs/template-ecosystem-documentation/spec.md`.
- Source files untouched and uncommitted by this phase:
  `iNNfo/specs/vocabulary.json`, `docs/innfo/documentation/vocabulary.md`,
  `iNNfo/AGENTS.md`, the 13 `iNNfo/specs/templates/*/spec_NN.md` titles,
  `catalog.json`, editor `.vue` views, the three skills' `SKILL.md`,
  `docs/**` prose, and the backlog model.
- No merge, tag, pin, or manifest regeneration performed.

## Risks / Notes

- **Sibling-commit spec ownership**: `openspec/specs/canonical-vocabulary/spec.md`
  was authored into main specs during apply (commits `4814609`, `f9c9b11`),
  ahead of the archive. Archive correctly skipped a destructive re-merge since
  no `canonical-vocabulary` delta exists in the change folder. The main
  canonical-vocabulary spec content was verified against the change's
  proposal/design intent before deciding to leave it unchanged.
- **SUGGESTION-level residuals** (S-1, S-2) and strict-TDD artifact gap (S-3)
  carried forward from verify-report; none block archive.