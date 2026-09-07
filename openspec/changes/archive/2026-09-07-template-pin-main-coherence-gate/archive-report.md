# Archive Report: Template Pin ↔ Main Coherence Gate

**Change**: 2026-09-07-template-pin-main-coherence-gate
**Archived**: 2026-09-07
**Branch**: `feat/template-pin-main-coherence-gate`
**Mode**: openspec (spec-driven, `strict_tdd: true`)

## Summary

This change introduced a pin↔main coherence gate for templates on the `stable`
channel of the monorepo release manifest. Implementation was confined to the
three `scripts/manifest/` files (rule, re-export, and tests); the delta spec was
merged into the main spec as part of this archive step.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| monorepo-release-manifest | Updated | 1 ADDED requirement ("Stable Template Main Coherence", 5 scenarios) merged into `openspec/specs/monorepo-release-manifest/spec.md`; the 3 pre-existing requirements preserved |

Main spec now contains 4 requirements total:
1. Unified Monorepo Distribution Source (preserved)
2. Stable Channel Tag Provenance (preserved)
3. Removal of Manifest Allowlist in CI Checker (preserved)
4. Stable Template Main Coherence (ADDED)

## Archive Contents

- `proposal.md`
- `design.md`
- `tasks.md` — 20/20 tasks complete, all checked `[x]`
- `verify-report.md`
- `apply-progress.md` — TDD Cycle Evidence table (persisted during apply)
- `specs/monorepo-release-manifest.md` — delta spec (ADDED requirements)

## Verify Verdict

**PASS WITH WARNINGS** — no CRITICAL issues, archive proceeds.

- Tests: 25/25 green (18 baseline + 7 new coherence cases)
- Aggregate gate `node scripts/verify.js`: green (including typecheck and a
  real-network stable validation with zero coherence violations)
- Spec compliance: 5/5 scenarios compliant; design D1–D6 followed
- Diff scope: confined to the 3 intended files

### Warnings disposition

1. **TDD cycle evidence not persisted** (WARNING-1) → **RESOLVED**: the
   orchestrator persisted `apply-progress.md` (with the TDD Cycle Evidence
   table) in the change root before archive. RED confirmed via
   `TypeError: mod.checkTemplateMainCoherence is not a function`.
2. **Plain fetch-failure branch (404/500) not directly tested** (SUGGESTION,
   non-blocking) → documented in `apply-progress.md` and `verify-report.md`;
   the 403/rate-limit branch is covered by case 19. No spec scenario requires
   a plain fetch failure, so this is not a compliance gap.

## Source of Truth

`openspec/specs/monorepo-release-manifest/spec.md` now reflects the new
behavior.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
