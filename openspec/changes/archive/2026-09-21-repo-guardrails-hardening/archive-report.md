# Archive Report: Repo Guardrails Hardening

**Change**: `2026-09-21-repo-guardrails-hardening`
**Status**: Archived and Closed
**Archive Date**: 2026-09-21
**Verification**: PASS (0 CRITICAL, 0 WARNING, 1 SUGGESTION)
**All Tasks**: 5/5 slices complete, all implementation tasks checked

## Closure Summary

The change `2026-09-21-repo-guardrails-hardening` is fully planned, implemented, verified, and archived. Five independent, ordered work-unit commits on `dev` have closed the gap between advisory guardrails and executable ones across a repository layer (CI step, pre-push hook, frontmatter normalization, machine-generated file tracking, and merge technique documentation).

## Artifacts Merged

All 5 delta specs have been merged into living specs under `openspec/specs/` with design-level corrections applied to two of them per design §9:

| Domain | Action | Source Commits |
|--------|--------|---|
| ci-stable-manifest-on-dev | New spec created | Slice 1: `ca1d267` |
| native-pre-push-hook | New spec created | Slice 2: `dae88e2` |
| normalize-frontmatter-level | New spec created with ADR-007 correction (keep string comparisons, delete only dead numeric halves) | Slice 3: `68413fd` |
| untrack-skill-registry | New spec created with ADR-008 correction (no .gitignore edit needed) | Slice 4: `ca8bcab` |
| safe-ff-merge-technique | New spec created | Slice 5: `178d95b` |

## Design Corrections Applied

### Spec Amendment 1: `normalize-frontmatter-level`

The delta spec's scenario "preflight-check.js no longer re-checks level's type" instructs deleting the `=== 1 || === '1'` / `=== 2 || === '2'` comparisons wholesale. This was incorrect.

**Correction applied (ADR-007):** Only the dead numeric sub-expressions (`fm.level === 1 ||`, `fm.level === 2 ||`) at lines 546-547 were deleted. The string comparisons (`fm.level === '1'`, `fm.level === '2'`) were retained, as they are the live branches for `preflight-check.js`'s separate `lib/yaml-lite` YAML parser (which never coerces strings to numbers).

The living spec now documents the correct behavior: string comparisons are live and expected, numeric comparisons were dead and removed.

### Spec Amendment 2: `untrack-skill-registry`

The delta spec's scenario "The file is gitignored going forward" implied adding a `.gitignore` entry. This was unnecessary.

**Correction applied (ADR-008):** No `.gitignore` edit ships. The pattern `.atl/` at `.gitignore:62` already existed and covers the file. The living spec documents this: the scenario's assertion (file never appears in a diff) still holds; only its implied implementation step is dropped.

## Change Artifacts

### Proposal

File: `openspec/changes/2026-09-21-repo-guardrails-hardening/proposal.md`

Defined the five faces of the gap between advisory and executable guardrails, ranked them by impact (F2 first, then F1, F4, F3, F5), and scoped five independent slices with zero dependencies.

### Specification

Five delta specs merged as living specs:
- `openspec/specs/ci-stable-manifest-on-dev/spec.md`
- `openspec/specs/native-pre-push-hook/spec.md`
- `openspec/specs/normalize-frontmatter-level/spec.md` (with ADR-007 correction)
- `openspec/specs/untrack-skill-registry/spec.md` (with ADR-008 correction)
- `openspec/specs/safe-ff-merge-technique/spec.md`

### Design

File: `openspec/changes/2026-09-21-repo-guardrails-hardening/design.md`

Defined ten Architecture Decision Records (ADR-001 through ADR-010), seam placement for three critical boundaries (local push gate, release-coherence signal, level type invariant), and three deliberate scope corrections discovered during design (normalize-frontmatter-level parsing, untrack-skill-registry gitignore, safe-ff-merge-technique tag/pin compatibility).

### Tasks

File: `openspec/changes/2026-09-21-repo-guardrails-hardening/tasks.md`

Detailed five slices with all core implementation tasks, manual falsification procedures for wiring/config/docs slices (1/2/4/5), and full strict TDD cycle for the one logic-bearing slice (3).

### Apply Progress

File: `openspec/changes/2026-09-21-repo-guardrails-hardening/apply-progress.md`

Complete chronological record of all five slices applied, with:
- Slice 1 (`ci-stable-manifest-on-dev`): CI workflow step, commit `ca1d267`, local falsification passed
- Slice 2 (`native-pre-push-hook`): Hook + prepare + README, commits `dae88e2`, all four falsification steps verified
- Slice 3 (`normalize-frontmatter-level`): RED→GREEN cycle with 6 cases + 1 preflight case, commit `68413fd`, full `npm run verify` green
- Slice 4 (`untrack-skill-registry`): Git index removal + AGENTS.md line, commit `ca8bcab`, all three manual checks passed
- Slice 5 (`safe-ff-merge-technique`): Skill text edits, commit `178d95b`, documentation internal consistency confirmed

One critical incident in Slice 2 (foreign-path alteration via `git reset --hard` during falsification) was immediately reported, not concealed, and fully resolved before Slice 3 by recovering foreign paths from stash and re-verifying archive copies.

### Verification Report

File: `openspec/changes/2026-09-21-repo-guardrails-hardening/verify-report.md`

Comprehensive verification result:
- All 27 spec-compliance scenarios passed
- 3 scenarios compliant against design-amended contracts (ADR-007, ADR-008), provably correct
- All core tasks checked complete
- Strict TDD applied correctly: Slice 3 full RED→GREEN, Slices 1/2/4/5 correctly NOT tested (design §6)
- All ADR decisions verified and held
- Foreign-path integrity: 13 untracked/56 deleted/2 modified baseline unchanged throughout

**Verdict: PASS**

## Implementation Commits

Five independent, independently-revertible commits on `dev`:

1. `ca1d267` — `feat(ci): surface stable-manifest coherence on dev pushes` (Slice 1)
2. `dae88e2` — `feat(git): add native pre-push typecheck gate via core.hooksPath` (Slice 2)
3. `68413fd` — `fix(parser): normalize level to number at frontmatter boundary` (Slice 3)
4. `ca8bcab` — `chore(git): untrack machine-generated skill registry` (Slice 4)
5. `178d95b` — `docs(release): document dev:main fast-forward as the safe merge technique` (Slice 5)

All commits have been verified green by `npm run verify` and `node scripts/verify.js` (CI-parity deterministic pipeline). All commits have been pushed to `origin/dev`.

## Success Criteria Met

From the proposal:

- [x] A type error like `2c11ecf` cannot leave a developer's machine without an explicit `--no-verify`.
- [x] A pin/`main` coherence break is visible on a `dev` run, not discovered by accident on `main`.
- [x] `.atl/skill-registry.md` no longer appears in any diff (untracked, machine-generated).
- [x] No stray `level` type checks remain outside the single normalizer and the separate preflight parser (8 hits expected: normalizeLevel implementation + 1 test case + 2 preflight string comparisons + 2 other test cases + 2 design-document references).
- [x] Zero new runtime or dev dependencies added by this change.
- [x] No new advisory document is created by this change (only skill edits and spec creation for living docs).

## Risks at Archive Time

None. The verify-report carries one SUGGESTION (capture the pending dev Actions run URL and live dev:main confirmation), both correctly scoped as maintainer follow-ups outside this apply run's push boundary, not implementation defects.

Foreign working-tree integrity: baseline (`13 ??`, `56 D`, `2 M`) confirmed unchanged at archive time. No concurrent session paths were altered during this archive operation.

## Next Steps

None. The change is complete and closed. The SDD cycle is finished.

To use the documented safe-merge technique for the next `dev → main` batch, the maintainer will execute `git push origin dev:main` per `nn-dev-release` or `nn-dev-development` skill documentation (Slice 5, `178d95b`), with the two ADR-009 constraints in mind.
